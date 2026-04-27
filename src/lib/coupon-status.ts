import type { Coupon, CouponStatus } from "@/types/coupon";

/**
 * Status efetivo do cupom calculado em tempo real.
 *
 * Regras (em ordem de prioridade):
 * 1. Se `validUntil` existe e já passou → EXPIRADO
 * 2. Se `maxUses` existe e `usedCount >= maxUses` → EXPIRADO
 * 3. Caso contrário → usa o `status` salvo no registro
 *
 * UI pode refinar mais (ex: ESGOTADO ≠ EXPIRADO) usando os helpers em `coupons-metrics`.
 */
export function computeCouponStatus(coupon: Coupon, now: Date = new Date()): CouponStatus {
  if (coupon.validUntil) {
    const expiry = new Date(coupon.validUntil);
    if (expiry < now) return "EXPIRADO";
  }

  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    return "EXPIRADO";
  }

  return coupon.status;
}
