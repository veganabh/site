/**
 * coupons-metrics.ts — funções puras de métricas para o painel de cupons.
 *
 * Usado no strip de KPIs acima da tabela de cupons.
 * Quando Supabase for integrado, as funções continuam puras — muda só a fonte dos dados.
 */

import type { Coupon } from "@/types/coupon";
import { computeCouponStatus } from "@/lib/coupon-status";

export type CouponsMetrics = {
  /** Cupons com status computado ATIVO. */
  activeCount: number;
  /** Cupons expirados (data passou OU maxUses atingido). */
  expiredCount: number;
  /** Cupons inativos (desligados manualmente, não expirados). */
  inactiveCount: number;
  /** Total acumulado de usos de todos os cupons. */
  totalUses: number;
  /** Percentual médio de uso sobre maxUses (só cupons com limite). 0-100. */
  avgUsagePct: number;
};

/**
 * Retorna `true` quando o cupom "esgotou" por `maxUses` (≠ expirou por data).
 * Útil para diferenciar visualmente cupom esgotado vs expirado por tempo.
 */
export function isExhaustedByUses(coupon: Coupon): boolean {
  return coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses;
}

/**
 * Retorna `true` se o cupom já passou da `validUntil` (expirou por tempo).
 */
export function isExpiredByDate(coupon: Coupon, now: Date = new Date()): boolean {
  if (!coupon.validUntil) return false;
  return new Date(coupon.validUntil) < now;
}

export function calcCouponsMetrics(coupons: Coupon[]): CouponsMetrics {
  let activeCount = 0;
  let expiredCount = 0;
  let inactiveCount = 0;
  let totalUses = 0;

  const usagePcts: number[] = [];

  for (const c of coupons) {
    const status = computeCouponStatus(c);
    if (status === "ATIVO") activeCount++;
    else if (status === "EXPIRADO") expiredCount++;
    else inactiveCount++;

    totalUses += c.usedCount;

    if (c.maxUses !== undefined && c.maxUses > 0) {
      usagePcts.push(Math.min(100, (c.usedCount / c.maxUses) * 100));
    }
  }

  const avgUsagePct =
    usagePcts.length === 0
      ? 0
      : Math.round(usagePcts.reduce((a, b) => a + b, 0) / usagePcts.length);

  return { activeCount, expiredCount, inactiveCount, totalUses, avgUsagePct };
}
