/**
 * ROI de cupom — receita gerada vs desconto dado, por cupom. Funções puras
 * sobre `orders`. Saúde financeira da promoção: saber se cupom traz receita
 * ou só corta margem.
 *
 * Considera pedidos não-cancelados com cupom aplicado.
 */

import type { Order } from "@/types/order";

export type CouponRoi = {
  code: string;
  uses: number;
  /** Total de desconto concedido (R$). */
  discountGiven: number;
  /** Receita dos pedidos que usaram o cupom (R$). */
  revenue: number;
  avgTicket: number;
  /** receita ÷ desconto. null se desconto 0. Alto = promo eficiente. */
  roi: number | null;
};

export type CouponRoiSummary = {
  coupons: CouponRoi[];
  totalUses: number;
  totalDiscount: number;
  totalRevenue: number;
  /** receita total com cupom ÷ desconto total. null se sem desconto. */
  overallRoi: number | null;
};

export function buildCouponRoi(orders: Order[]): CouponRoiSummary {
  const withCoupon = orders.filter((o) => o.status !== "CANCELADO" && o.couponApplied);

  const byCode = new Map<string, Order[]>();
  for (const o of withCoupon) {
    const code = o.couponApplied!.code;
    const list = byCode.get(code) ?? [];
    list.push(o);
    byCode.set(code, list);
  }

  const coupons: CouponRoi[] = [];
  for (const [code, list] of byCode) {
    const discountGiven = list.reduce((s, o) => s + (o.couponApplied?.discountValue ?? 0), 0);
    const revenue = list.reduce((s, o) => s + o.total, 0);
    coupons.push({
      code,
      uses: list.length,
      discountGiven,
      revenue,
      avgTicket: revenue / list.length,
      roi: discountGiven > 0 ? revenue / discountGiven : null,
    });
  }

  coupons.sort((a, b) => b.revenue - a.revenue);

  const totalUses = coupons.reduce((s, c) => s + c.uses, 0);
  const totalDiscount = coupons.reduce((s, c) => s + c.discountGiven, 0);
  const totalRevenue = coupons.reduce((s, c) => s + c.revenue, 0);

  return {
    coupons,
    totalUses,
    totalDiscount,
    totalRevenue,
    overallRoi: totalDiscount > 0 ? totalRevenue / totalDiscount : null,
  };
}
