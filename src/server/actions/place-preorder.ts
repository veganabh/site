"use server";

/**
 * Place-preorder — Cria encomenda (order_type='preorder') com validações específicas.
 *
 * Diferenças em relação ao place-order diário (ADR 0013):
 *  - order_type = 'preorder'
 *  - scheduled_date + scheduled_hour obrigatórios
 *  - Valida lead mín/máx contra store_settings
 *  - Valida capacidade por dia (conta encomendas pagas/ativas na mesma data)
 *  - Valida valor mínimo (preorder_min_value_cents)
 *  - Ignora estoque do produto (encomenda = produção sob demanda)
 *  - Mesmo fluxo AbacatePay — reutiliza createPixCharge/createCheckout
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseServiceClient } from "@/server/supabase/service";
import { reaisToCents } from "@/server/supabase/mappers";
import {
  createPixCharge,
  createCheckout,
  mapPixStatusToPaymentStatus,
} from "@/server/payments/abacatepay";
import { SEED_PREORDER } from "@/types/store-settings";
import type { ShippingAddress } from "@/types/order";

// ── Schemas ───────────────────────────────────────────────────────────────────

const preorderItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().positive().max(99),
});

const shippingAddressSchema: z.ZodType<ShippingAddress> = z.object({
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(120).optional(),
  neighborhood: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2),
  cep: z.string().regex(/^\d{5}-?\d{3}$/),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const inputSchema = z.object({
  items: z.array(preorderItemSchema).min(1, "Carrinho vazio."),
  shippingAddress: shippingAddressSchema,
  shippingFee: z.number().nonnegative().default(0),
  /** Data de entrega acordada ("YYYY-MM-DD"). */
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  /** Hora inteira de entrega (0–23). */
  scheduledHour: z.number().int().min(0).max(23),
  paymentMethod: z.enum(["pix", "card"]).default("pix"),
  couponCode: z.string().trim().max(80).optional(),
});

export type PlacePreorderInput = z.infer<typeof inputSchema>;

export type PlacePreorderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: number;
      paymentFallback: boolean;
      redirectUrl?: string;
    }
  | { ok: false; message: string };

// ── Action ────────────────────────────────────────────────────────────────────

export async function placePreorderAction(input: PlacePreorderInput): Promise<PlacePreorderResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Dados da encomenda inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Faça login para fazer uma encomenda." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, cpf")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, message: "Não encontramos seus dados. Atualize seu cadastro em /conta." };
  }

  if (!profile.phone) {
    return { ok: false, message: "Cadastre um WhatsApp em /conta antes de encomendar." };
  }

  if (!profile.cpf || profile.cpf.replace(/\D/g, "").length !== 11) {
    return {
      ok: false,
      message: "Cadastre seu CPF em /conta antes de encomendar — é obrigatório pra emitir o PIX.",
    };
  }

  // Lê configurações de encomenda
  const { data: settingsRow } = await supabase
    .from("store_settings")
    .select(
      "preorder_min_lead_days, preorder_max_lead_days, preorder_min_value_cents, preorder_daily_capacity, preorder_hour_from, preorder_hour_to",
    )
    .eq("id", "default")
    .maybeSingle();

  const settings = {
    minLeadDays: settingsRow?.preorder_min_lead_days ?? SEED_PREORDER.minLeadDays,
    maxLeadDays: settingsRow?.preorder_max_lead_days ?? SEED_PREORDER.maxLeadDays,
    minValueCents: settingsRow?.preorder_min_value_cents ?? SEED_PREORDER.minValueCents,
    dailyCapacity: settingsRow?.preorder_daily_capacity ?? null,
    hourFrom: settingsRow?.preorder_hour_from ?? SEED_PREORDER.hourFrom,
    hourTo: settingsRow?.preorder_hour_to ?? SEED_PREORDER.hourTo,
  };

  // Valida lead (antecedência)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(`${parsed.data.scheduledDate}T00:00:00`);
  const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < settings.minLeadDays) {
    return {
      ok: false,
      message: `Encomenda precisa de pelo menos ${settings.minLeadDays} dias de antecedência.`,
    };
  }
  if (diffDays > settings.maxLeadDays) {
    return {
      ok: false,
      message: `Encomenda aceita no máximo ${settings.maxLeadDays} dias de antecedência.`,
    };
  }

  // Valida hora
  if (
    parsed.data.scheduledHour < settings.hourFrom ||
    parsed.data.scheduledHour > settings.hourTo
  ) {
    return {
      ok: false,
      message: `Horário de entrega deve ser entre ${settings.hourFrom}h e ${settings.hourTo}h.`,
    };
  }

  // Valida capacidade por dia
  if (settings.dailyCapacity !== null) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("order_type", "preorder")
      .eq("scheduled_date", parsed.data.scheduledDate)
      .eq("payment_status", "PAGO")
      .neq("status", "CANCELADO");

    if ((count ?? 0) >= settings.dailyCapacity) {
      return {
        ok: false,
        message: `Capacidade esgotada para ${parsed.data.scheduledDate}. Escolha outra data.`,
      };
    }
  }

  // Valida produtos (só active + not deleted; ignora estoque para preorder)
  const productIds = parsed.data.items.map((i) => i.productId);
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select(
      "id, name, category, price_site_cents, price_ifood_cents, active, deleted_at, available_for_preorder, abacatepay_product_id",
    )
    .in("id", productIds);

  if (productsError) {
    console.error("[place-preorder] products lookup:", productsError.message);
    return { ok: false, message: "Não foi possível validar os produtos." };
  }

  const productById = new Map((productRows ?? []).map((p) => [p.id as string, p]));

  for (const item of parsed.data.items) {
    const product = productById.get(item.productId);
    if (!product || product.deleted_at || !product.active) {
      return {
        ok: false,
        message: "Algum item da encomenda não está mais disponível.",
      };
    }
    if (!product.available_for_preorder) {
      return {
        ok: false,
        message: `"${product.name}" não aceita encomenda.`,
      };
    }
  }

  const subtotalCents = parsed.data.items.reduce((acc, item) => {
    const product = productById.get(item.productId);
    return acc + (product?.price_site_cents ?? 0) * item.qty;
  }, 0);

  // Valida valor mínimo
  if (subtotalCents < settings.minValueCents) {
    const minBRL = (settings.minValueCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return {
      ok: false,
      message: `Encomenda mínima é ${minBRL}.`,
    };
  }

  const shippingFeeCents = reaisToCents(parsed.data.shippingFee);

  // Cupom (reutiliza RPC existente)
  let couponDiscountCents = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (parsed.data.couponCode) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("validate_coupon", {
      p_code: parsed.data.couponCode,
      p_cart_total_cents: subtotalCents,
      p_user_id: profile.id,
    });

    if (rpcError) {
      console.error("[place-preorder] coupon RPC:", rpcError.message);
      return { ok: false, message: "Não foi possível validar o cupom. Tente de novo." };
    }

    const result = rpcData as {
      valid: boolean;
      reason?: string;
      coupon_id?: string;
      discount_cents?: number;
    } | null;

    if (!result?.valid) {
      const reasonMsg: Record<string, string> = {
        not_first_purchase: "Esse cupom é só pra primeira compra. Remova pra finalizar.",
        already_used: "Você já usou esse cupom. Remova pra finalizar.",
        requires_login: "Esse cupom exige conta. Remova pra finalizar.",
      };
      const msg =
        (result?.reason && reasonMsg[result.reason]) ??
        "Esse cupom não vale mais. Remova e tente de novo.";
      return { ok: false, message: msg };
    }

    couponDiscountCents = result.discount_cents ?? 0;
    couponId = result.coupon_id ?? null;
    couponCode = parsed.data.couponCode;
  }

  const totalCents = subtotalCents + shippingFeeCents - couponDiscountCents;
  if (totalCents < 0) {
    return {
      ok: false,
      message: "O valor da encomenda não bateu na conferência. Atualize a página.",
    };
  }

  const customerName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  const service = createSupabaseServiceClient();

  const { data: orderRow, error: orderError } = await service
    .from("orders")
    .insert({
      profile_id: profile.id,
      customer_name: customerName || profile.first_name || "Cliente",
      customer_phone: profile.phone,
      shipping_address_snapshot: parsed.data.shippingAddress,
      status: "NOVO",
      payment_status: "PENDENTE",
      source: "site",
      order_type: "preorder",
      scheduled_date: parsed.data.scheduledDate,
      scheduled_hour: parsed.data.scheduledHour,
      subtotal_cents: subtotalCents,
      shipping_fee_cents: shippingFeeCents,
      discount_total_cents: couponDiscountCents,
      total_cents: totalCents,
      coupon_id: couponId,
      coupon_code: couponCode,
      coupon_discount_cents: couponCode ? couponDiscountCents : null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !orderRow) {
    console.error("[place-preorder] orders insert:", orderError?.message);
    return { ok: false, message: "Não foi possível criar a encomenda. Tente de novo." };
  }

  const orderId = orderRow.id as string;
  const orderNumber = orderRow.order_number as number;

  const itemRows = parsed.data.items.map((item) => {
    const product = productById.get(item.productId);
    return {
      order_id: orderId,
      is_kit: false,
      product_id: item.productId,
      product_name: product?.name ?? "",
      product_category: product?.category ?? null,
      qty: item.qty,
      unit_price_site_cents: product?.price_site_cents ?? 0,
      unit_price_ifood_cents: product?.price_ifood_cents ?? 0,
    };
  });

  const { error: itemsError } = await service.from("order_items").insert(itemRows);

  if (itemsError) {
    console.error("[place-preorder] order_items insert:", itemsError.message);
    await service
      .from("orders")
      .update({ status: "CANCELADO", cancel_reason: "Falha ao registrar itens da encomenda." })
      .eq("id", orderId);
    return { ok: false, message: "Não foi possível salvar os itens. Tente de novo." };
  }

  // Pagamento — reutiliza AbacatePay (D6 ADR 0013)
  let paymentFallback = false;
  let redirectUrl: string | undefined;

  const customerPayload = {
    name: customerName || profile.first_name || "Cliente Veg.ana",
    email: user.email ?? "no-reply@veg.ana",
    cellphone: profile.phone,
    taxId: profile.cpf,
  };

  const description = `Veg.ana - Encomenda #${orderNumber} para ${parsed.data.scheduledDate}`;

  if (parsed.data.paymentMethod === "card") {
    const missingSync = parsed.data.items.find((item) => {
      const product = productById.get(item.productId);
      return !product?.abacatepay_product_id;
    });

    if (missingSync) {
      paymentFallback = true;
      await insertManualPayment(service, orderId, totalCents, "Produto sem ID AbacatePay.");
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
      const checkoutResult = await createCheckout({
        items: parsed.data.items.map((item) => ({
          id: productById.get(item.productId)!.abacatepay_product_id!,
          quantity: item.qty,
        })),
        externalId: orderId,
        customer: customerPayload,
        returnUrl: `${baseUrl}/encomendas`,
        completionUrl: `${baseUrl}/obrigado/${orderId}`,
        methods: ["CARD"],
        maxInstallments: 3,
        metadata: {
          orderId,
          orderNumber,
          orderType: "preorder",
          scheduledDate: parsed.data.scheduledDate,
        },
      });

      if (checkoutResult.ok) {
        redirectUrl = checkoutResult.checkout.url;
        await service.from("payments").insert({
          order_id: orderId,
          provider: "abacatepay",
          method: "credit_card",
          status: mapPixStatusToPaymentStatus(checkoutResult.checkout.status),
          amount_cents: totalCents,
          provider_charge_id: checkoutResult.checkout.id,
          raw_payload: {
            url: checkoutResult.checkout.url,
            status: checkoutResult.checkout.status,
            externalId: checkoutResult.checkout.externalId,
          },
        });
      } else {
        paymentFallback = true;
        await insertManualPayment(service, orderId, totalCents, checkoutResult.error);
      }
    }
  } else {
    const pixResult = await createPixCharge({
      amountCents: totalCents,
      description,
      customer: customerPayload,
    });

    if (pixResult.ok) {
      await service.from("payments").insert({
        order_id: orderId,
        provider: "abacatepay",
        method: "pix",
        status: mapPixStatusToPaymentStatus(pixResult.charge.status),
        amount_cents: totalCents,
        provider_charge_id: pixResult.charge.id,
        raw_payload: {
          brCode: pixResult.charge.brCode,
          brCodeBase64: pixResult.charge.brCodeBase64,
          expiresAt: pixResult.charge.expiresAt,
          devMode: pixResult.charge.devMode,
          status: pixResult.charge.status,
        },
      });
    } else {
      paymentFallback = true;
      await insertManualPayment(service, orderId, totalCents, pixResult.error);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, orderId, orderNumber, paymentFallback, redirectUrl };
}

async function insertManualPayment(
  service: ReturnType<typeof createSupabaseServiceClient>,
  orderId: string,
  amountCents: number,
  error: string,
): Promise<void> {
  const { error: paymentError } = await service.from("payments").insert({
    order_id: orderId,
    provider: "manual",
    method: null,
    status: "failed",
    amount_cents: amountCents,
    raw_payload: { error },
  });
  if (paymentError) console.error("[place-preorder] payments fallback:", paymentError.message);
}
