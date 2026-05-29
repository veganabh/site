/**
 * Margem por produto — receita vs custo (CPV), a partir de itens de pedido +
 * custo cadastrado no produto. Funções puras. Pedidos CANCELADO ignorados.
 *
 * marginPct é null e hasCost=false quando o CPV não foi informado (cost 0) —
 * a UI sinaliza "informe o custo" nesses casos.
 */

import type { Order } from "@/types/order";
import type { Product } from "@/types/product";

export type ProductMarginRow = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  margin: number;
  /** margin / revenue (0..1). null se sem custo ou sem receita. */
  marginPct: number | null;
  hasCost: boolean;
};

export type ProductMarginSummary = {
  rows: ProductMarginRow[];
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  overallMarginPct: number | null;
  /** Quantos produtos vendidos estão sem CPV cadastrado. */
  missingCostCount: number;
};

export function buildProductMargin(
  orders: Order[],
  products: Product[],
): ProductMarginSummary {
  const productById = new Map(products.map((p) => [p.id, p]));

  type Agg = { units: number; revenue: number };
  const byProduct = new Map<string, Agg>();

  for (const o of orders) {
    if (o.status === "CANCELADO") continue;
    for (const item of o.items) {
      const agg = byProduct.get(item.productId) ?? { units: 0, revenue: 0 };
      agg.units += item.qty;
      agg.revenue += item.qty * item.unitPriceSite;
      byProduct.set(item.productId, agg);
    }
  }

  const rows: ProductMarginRow[] = [];
  for (const [productId, a] of byProduct) {
    const product = productById.get(productId);
    const unitCost = product?.cost ?? 0;
    const hasCost = unitCost > 0;
    const cost = a.units * unitCost;
    const margin = a.revenue - cost;
    rows.push({
      productId,
      name: product?.name ?? "(removido)",
      unitsSold: a.units,
      revenue: a.revenue,
      cost,
      margin,
      marginPct: hasCost && a.revenue > 0 ? margin / a.revenue : null,
      hasCost,
    });
  }

  rows.sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const missingCostCount = rows.filter((r) => r.unitsSold > 0 && !r.hasCost).length;

  return {
    rows,
    totalRevenue,
    totalCost,
    totalMargin,
    overallMarginPct: totalRevenue > 0 ? totalMargin / totalRevenue : null,
    missingCostCount,
  };
}
