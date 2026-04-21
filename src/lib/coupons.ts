/**
 * Fonte canônica de cupons da Veg.ana.
 * Importar daqui — nunca redefinir em componente.
 */

export type Coupon = {
  code: string;
  /** Rótulo curto exibido no chip (ex: "VEGANA10"). */
  label: string;
  /** Descrição da vantagem (ex: "−10% no pedido"). */
  hint: string;
  /** Calcula o valor de desconto dado o subtotal atual (em R$). Contexto opcional para cupons condicionais (ex: FRETE0). */
  discount: (subtotal: number, ctx?: CartContext) => number;
};

/**
 * Contexto do carrinho necessário para avaliar aplicabilidade do cupom.
 */
export type CartContext = {
  subtotal: number;
  /** Taxa de entrega atual (0 = grátis). */
  shippingFee: number;
};

export const COUPONS_MAP: Record<string, Coupon> = {
  VEGANA10: {
    code: "VEGANA10",
    label: "VEGANA10",
    hint: "−10% no pedido",
    discount: (s) => s * 0.1,
  },
  FRETE0: {
    code: "FRETE0",
    label: "FRETE0",
    hint: "frete grátis",
    // Desconto real é o frete cobrado; se frete já é 0, cupom não agrega valor.
    discount: (_, ctx?: CartContext) => ctx?.shippingFee ?? 0,
  },
  BEM5: {
    code: "BEM5",
    label: "BEM5",
    hint: "−R$ 5,00",
    discount: (subtotal) => Math.min(5, subtotal),
  },
};

export const AVAILABLE_COUPONS: Coupon[] = Object.values(COUPONS_MAP);

/**
 * Valida um código de cupom (case-insensitive).
 * Retorna o Coupon se válido, null se inválido.
 */
export function validateCoupon(code: string): Coupon | null {
  return COUPONS_MAP[code.trim().toUpperCase()] ?? null;
}

/**
 * Retorna true se aplicar o cupom no contexto atual resultaria em desconto > 0.
 *
 * Use para filtrar a lista "Cupons disponíveis" — ocultar cupons que não dariam
 * benefício real ao cliente (ex: FRETE0 quando frete já é grátis; BEM5 quando
 * subtotal é zero).
 */
export function isCouponApplicable(coupon: Coupon, ctx: CartContext): boolean {
  return coupon.discount(ctx.subtotal, ctx) > 0;
}
