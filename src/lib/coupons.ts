import type { CouponType } from "@/types/coupon";

/**
 * Lib pura de cálculo de desconto. Shape do `Coupon` espelha a tabela
 * `public.coupons` (DB). Validação real (status/expiração/uso) acontece
 * server-side via RPC `validate_coupon` em `applyCouponAction`.
 *
 * Estas funções são para preview/render — nunca para autorizar pedido.
 */

export type CartContext = {
  subtotal: number;
  /** Taxa de entrega atual (R$). 0 = grátis. */
  shippingFee: number;
};

/**
 * Shape mínimo necessário pra calcular desconto. Aceita tanto `Coupon`
 * (admin, completo) quanto `AppliedCoupon` (cliente, derivado da RPC).
 */
export type DiscountableCoupon = {
  type: CouponType;
  /** PERCENTUAL: 0-100. FIXO: R$. FRETE_GRATIS: ignorado. */
  value: number;
  /** Em R$. Undefined = sem mínimo. */
  minOrderValue?: number;
};

/**
 * Calcula o valor de desconto em R$ aplicado pelo cupom no contexto atual.
 *
 * - PERCENTUAL: subtotal × value/100
 * - FIXO: min(value, subtotal)
 * - FRETE_GRATIS: shippingFee (zera entrega)
 */
export function computeCouponDiscount(coupon: DiscountableCoupon, ctx: CartContext): number {
  switch (coupon.type) {
    case "PERCENTUAL":
      return Math.max(0, (ctx.subtotal * coupon.value) / 100);
    case "FIXO":
      return Math.max(0, Math.min(coupon.value, ctx.subtotal));
    case "FRETE_GRATIS":
      return Math.max(0, ctx.shippingFee);
    default:
      return 0;
  }
}

/**
 * Retorna true se aplicar o cupom geraria desconto > 0 no contexto atual.
 * Útil pra esconder cupons inúteis (ex: FRETE0 com frete já 0).
 */
export function isCouponApplicable(coupon: DiscountableCoupon, ctx: CartContext): boolean {
  if (coupon.minOrderValue !== undefined && ctx.subtotal < coupon.minOrderValue) {
    return false;
  }
  return computeCouponDiscount(coupon, ctx) > 0;
}
