"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseServiceClient } from "@/server/supabase/service";
import { reaisToCents } from "@/server/supabase/mappers";
import {
  createCheckout,
  createPixCharge,
  mapPixStatusToPaymentStatus,
} from "@/server/payments/abacatepay";
import type { ShippingAddress } from "@/types/order";

/**
 * Cria pedido server-side **sem** integrar gateway de pagamento (placeholder
 * pré-AbacatePay). Cliente fecha checkout → pedido entra em `orders` com
 * `payment_status = 'PENDENTE'` + `payments` row `provider = 'manual'`.
 *
 * Quando AbacatePay aprovar (D+2 — aguarda cadastro empresa), substituímos a
 * inserção de `payments(provider='manual')` por chamada `/payment/create` PIX
 * e retornamos `qrCode` no resultado. Resto do fluxo (UI confirma, kanban
 * mostra, mãe recebe WhatsApp) já está em pé.
 *
 * Decisões:
 * - **Auth obrigatória.** Guest checkout fica pra P1.
 * - **Preço autoritativo do servidor:** revalida products no DB. Cliente
 *   manda `productId + qty` apenas — preço vem do banco. Bloqueia tampering.
 * - **RLS:** orders.INSERT não tem policy → bloqueado pra `authenticated`.
 *   Decisão ADR 0008: server action via service-role. Usamos
 *   `createSupabaseServiceClient` que bypassa RLS (server-only).
 * - **Atomicidade fraca:** sem RPC. Insert orders → items → payment em
 *   sequência. Falha em items: marca order CANCELADO com cancel_reason
 *   (hard-delete proibido por trigger). Volume baixo, race rara.
 */

const itemSchema = z.object({
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
  items: z.array(itemSchema).min(1, "Carrinho vazio."),
  shippingAddress: shippingAddressSchema,
  shippingFee: z.number().nonnegative().default(0),
  couponCode: z.string().trim().max(80).optional(),
  /**
   * Método de pagamento. PIX = transparente (QR no site, ADR 0009 D1).
   * Card = checkout hospedado AbacatePay (redirect, parcelamento até 3x).
   */
  paymentMethod: z.enum(["pix", "card"]).default("pix"),
});

export type PlaceOrderInput = z.infer<typeof inputSchema>;

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: number;
      /**
       * `true` quando a cobrança AbacatePay falhou e o pedido caiu em
       * fallback manual (ADR 0009 D6). UI deve avisar o cliente que a Veg.ana
       * vai chamar no WhatsApp.
       */
      paymentFallback: boolean;
      /**
       * URL pra redirecionar o cliente pro checkout hospedado AbacatePay.
       * Preenchido apenas quando `paymentMethod === "card"` e a criação foi
       * bem-sucedida. PIX nunca redireciona (QR fica em `/obrigado/<id>`).
       */
      redirectUrl?: string;
    }
  | { ok: false; message: string };

export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Dados do pedido inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Faça login para finalizar o pedido." };
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
    return { ok: false, message: "Cadastre um WhatsApp em /conta antes de finalizar." };
  }

  // CPF obrigatório — AbacatePay v2 exige `customer.taxId` válido pra emissão PIX.
  // Sem isso o gateway rejeita e cai em fallback manual (mãe trata no WhatsApp).
  // Forçar coleta no checkout evita esse failover desnecessário.
  if (!profile.cpf || profile.cpf.replace(/\D/g, "").length !== 11) {
    return {
      ok: false,
      message: "Cadastre seu CPF em /conta antes de finalizar — é obrigatório pra emitir o PIX.",
    };
  }

  const productIds = parsed.data.items.map((i) => i.productId);
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select(
      "id, name, category, price_site_cents, price_ifood_cents, active, deleted_at, stock, abacatepay_product_id",
    )
    .in("id", productIds);

  if (productsError) {
    console.error("[place-order] products lookup:", productsError.message);
    return { ok: false, message: "Não foi possível validar os produtos." };
  }

  const productById = new Map(
    (productRows ?? []).map((p) => [p.id as string, p]),
  );

  for (const item of parsed.data.items) {
    const product = productById.get(item.productId);
    if (!product || product.deleted_at || !product.active) {
      return { ok: false, message: "Algum item do seu carrinho não está mais disponível. Revise o pedido." };
    }
    if ((product.stock ?? 0) < item.qty) {
      return {
        ok: false,
        message: `"${product.name}" não tem unidades suficientes disponíveis. Reduza a quantidade.`,
      };
    }
  }

  const subtotalCents = parsed.data.items.reduce((acc, item) => {
    const product = productById.get(item.productId);
    return acc + (product?.price_site_cents ?? 0) * item.qty;
  }, 0);

  const shippingFeeCents = reaisToCents(parsed.data.shippingFee);

  let couponDiscountCents = 0;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  if (parsed.data.couponCode) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("validate_coupon", {
      p_code: parsed.data.couponCode,
      p_cart_total_cents: subtotalCents,
    });

    if (rpcError) {
      console.error("[place-order] coupon RPC:", rpcError.message);
      return { ok: false, message: "Não foi possível validar o cupom. Tente de novo." };
    }

    const result = rpcData as
      | { valid: boolean; coupon_id?: string; discount_cents?: number }
      | null;

    if (!result?.valid) {
      return { ok: false, message: "Esse cupom não vale mais. Remova e tente de novo." };
    }

    couponDiscountCents = result.discount_cents ?? 0;
    couponId = result.coupon_id ?? null;
    couponCode = parsed.data.couponCode;
  }

  const totalCents = subtotalCents + shippingFeeCents - couponDiscountCents;
  if (totalCents < 0) {
    return {
      ok: false,
      message: "O valor do pedido não bateu na conferência. Atualize a página e tente de novo.",
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
    console.error("[place-order] orders insert:", orderError?.message);
    return { ok: false, message: "Não foi possível criar o pedido. Tente de novo." };
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
    console.error("[place-order] order_items insert:", itemsError.message);
    // Hard-delete proibido por trigger. Cancela com motivo.
    await service
      .from("orders")
      .update({ status: "CANCELADO", cancel_reason: "Falha ao registrar itens do pedido." })
      .eq("id", orderId);
    return { ok: false, message: "Não foi possível salvar os itens do pedido. Tente de novo." };
  }

  // Branch payment: PIX transparente vs Cartão hospedado (ADR 0009 D1).
  // Falha em qualquer cai em fallback manual (D6) — pedido fica `pending`,
  // mãe combina pagamento no WhatsApp.
  let paymentFallback = false;
  let redirectUrl: string | undefined;

  const customerPayload = {
    name: customerName || profile.first_name || "Cliente Veg.ana",
    email: user.email ?? "no-reply@veg.ana",
    cellphone: profile.phone,
    taxId: profile.cpf,
  };

  const description = `Veg.ana - Pedido #${orderNumber}`;

  if (parsed.data.paymentMethod === "card") {
    // Checkout hospedado exige produtos pré-cadastrados. Se algum item não
    // tem `abacatepay_product_id`, cai em fallback (admin roda sync).
    const missingSync = parsed.data.items.find((item) => {
      const product = productById.get(item.productId);
      return !product?.abacatepay_product_id;
    });

    if (missingSync) {
      paymentFallback = true;
      console.error(
        "[place-order] missing abacatepay_product_id for product:",
        missingSync.productId,
      );
      await insertManualPayment(
        service,
        orderId,
        totalCents,
        "Catálogo do cartão fora de sincronia. Rode `npm run abacatepay:sync-products`.",
      );
    } else {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";

      const checkoutResult = await createCheckout({
        items: parsed.data.items.map((item) => ({
          id: productById.get(item.productId)!.abacatepay_product_id!,
          quantity: item.qty,
        })),
        externalId: orderId,
        customer: customerPayload,
        returnUrl: `${baseUrl}/carrinho`,
        completionUrl: `${baseUrl}/obrigado/${orderId}`,
        methods: ["CARD"],
        maxInstallments: 3,
        metadata: { orderId, orderNumber },
      });

      if (checkoutResult.ok) {
        redirectUrl = checkoutResult.checkout.url;
        const { error: paymentError } = await service.from("payments").insert({
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

        if (paymentError) {
          console.error(
            "[place-order] payments insert (checkout):",
            paymentError.message,
          );
        }
      } else {
        paymentFallback = true;
        console.error("[place-order] AbacatePay createCheckout:", checkoutResult.error);
        await insertManualPayment(service, orderId, totalCents, checkoutResult.error);
      }
    }
  } else {
    // PIX transparente — caminho default.
    const pixResult = await createPixCharge({
      amountCents: totalCents,
      description,
      customer: customerPayload,
    });

    if (pixResult.ok) {
      const { error: paymentError } = await service.from("payments").insert({
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

      if (paymentError) {
        console.error("[place-order] payments insert (abacatepay):", paymentError.message);
      }
    } else {
      paymentFallback = true;
      console.error("[place-order] AbacatePay createPix:", pixResult.error);
      await insertManualPayment(service, orderId, totalCents, pixResult.error);
    }
  }

  // Layout-level revalidation: orders são hidratados no root layout
  // via `listAllOrders()` (admin-orders-store). Page-level só invalida o
  // segmento, não o layout pai — então o pedido novo não aparece em /conta.
  revalidatePath("/", "layout");

  return { ok: true, orderId, orderNumber, paymentFallback, redirectUrl };
}

/**
 * Insere payment row em fallback manual (ADR 0009 D6) — usado quando a
 * cobrança no AbacatePay falha por qualquer motivo. Mãe trata no WhatsApp.
 */
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

  if (paymentError) {
    console.error("[place-order] payments insert (fallback):", paymentError.message);
  }
}
