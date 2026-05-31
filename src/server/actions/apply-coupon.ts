"use server";

import { z } from "zod";

import { createSupabaseServerClient } from "@/server/supabase/server";
import type { Coupon, CouponType } from "@/types/coupon";

const inputSchema = z.object({
  code: z.string().trim().min(1, "Código obrigatório.").max(80),
  subtotalCents: z.coerce.number().int().nonnegative(),
});

const reasonMessages: Record<string, string> = {
  not_found: "Cupom não encontrado.",
  inactive: "Cupom indisponível no momento.",
  not_yet_valid: "Cupom ainda não está ativo.",
  expired: "Cupom expirado.",
  max_uses_reached: "Cupom esgotado.",
  exhausted: "Cupom esgotado.",
  below_min_order: "Pedido não atinge o mínimo do cupom.",
  min_order: "Pedido não atinge o mínimo do cupom.",
  requires_login: "Esse cupom é só pra primeira compra — entre na sua conta pra usar.",
  not_first_purchase: "Esse cupom é só pra primeira compra. Você já tem um pedido na casa. :)",
};

export type ApplyCouponResult =
  | {
      ok: true;
      coupon: Pick<Coupon, "id" | "code" | "label" | "hint" | "type" | "value">;
      discountCents: number;
    }
  | { ok: false; message: string; reason?: string };

type ValidateCouponRpc = {
  valid: boolean;
  reason?: string;
  coupon_id?: string;
  type?: CouponType;
  discount_cents?: number;
  label?: string;
  hint?: string;
  min_order_value_cents?: number;
};

/**
 * Valida cupom server-side via RPC `validate_coupon`. Cliente NUNCA deve
 * fazer SELECT direto na tabela `coupons` — a RPC é SECURITY DEFINER e
 * é o único caminho público para checar validade + calcular desconto.
 *
 * Retorna o cupom em shape mínimo (sem usedCount/maxUses) — UI usa pra
 * exibir badge `code/hint`. O `discountCents` já é a fonte da verdade do
 * desconto naquele instante; lib pura `computeCouponDiscount` recalcula
 * client-side em renders subsequentes (subtotal mudando).
 */
export async function applyCouponAction(input: {
  code: string;
  subtotalCents: number;
}): Promise<ApplyCouponResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Código de cupom inválido." };
  }

  const supabase = await createSupabaseServerClient();
  // Passa o usuário logado (se houver) pra RPC checar elegibilidade de
  // estreia. Convidado → p_user_id null → cupom FIRST_PURCHASE devolve
  // `requires_login` (mensagem amigável acima).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: parsed.data.code,
    p_cart_total_cents: parsed.data.subtotalCents,
    p_user_id: user?.id ?? undefined,
  });

  if (error) {
    console.error("[apply-coupon]", error.message);
    return { ok: false, message: "Não foi possível validar o cupom." };
  }

  const result = data as ValidateCouponRpc | null;
  if (!result || !result.valid) {
    const reason = result?.reason ?? "not_found";
    return {
      ok: false,
      reason,
      message: reasonMessages[reason] ?? "Cupom inválido.",
    };
  }

  if (!result.coupon_id || !result.type) {
    return { ok: false, message: "Resposta inválida do servidor." };
  }

  // O `value` original do cupom (R$ ou %) não vem na RPC — buscamos
  // a versão pública mínima que o cliente precisa para recalcular
  // descontos enquanto edita o carrinho. Isso requer o admin do cupom.
  // Workaround: o cliente NÃO recalcula — usa `discountCents` do RPC
  // sempre que o subtotal muda, chamando applyCouponAction de novo.
  // Para preview imediato pós-aplicação, derivamos `value` do tipo:
  // - PERCENTUAL: discount/subtotal; FIXO: discount; FRETE_GRATIS: 0
  const subtotalCents = parsed.data.subtotalCents;
  const discountCents = result.discount_cents ?? 0;

  let value = 0;
  if (result.type === "PERCENTUAL" && subtotalCents > 0) {
    value = Math.round((discountCents / subtotalCents) * 100);
  } else if (result.type === "FIXO") {
    value = discountCents / 100;
  }

  return {
    ok: true,
    discountCents,
    coupon: {
      id: result.coupon_id,
      code: parsed.data.code,
      label: result.label ?? parsed.data.code,
      hint: result.hint ?? "",
      type: result.type,
      value,
    },
  };
}
