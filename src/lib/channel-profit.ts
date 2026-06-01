/**
 * Lucratividade LÍQUIDA por produto e por canal — o lucro que sobra de verdade
 * depois de CPV e da taxa do canal (iFood 26,2% / site PIX R$0,80).
 *
 * Substitui a antiga margem BRUTA (sem taxa, e que erradamente usava o preço de
 * site pra todo pedido): aqui cada venda é contada no SEU canal real
 * (`order.source`), com o preço daquele canal e a taxa daquele canal.
 *
 * Também calcula o **ganho de migração**: quanto as vendas que aconteceram no
 * iFood renderiam se tivessem vindo pelo site (PIX) — a alavanca estratégica
 * de tirar volume do iFood.
 *
 * Funções puras. Pedidos CANCELADO ignorados. Produtos sem CPV entram com
 * lucro null (não inventa) e são contados em `missingCostCount`.
 */

import type { Order } from "@/types/order";
import type { Product } from "@/types/product";
import { channelMargin } from "@/lib/fees";

export type ChannelProfitRow = {
  productId: string;
  name: string;
  hasCost: boolean;
  /** unidades vendidas no período, por canal de origem real. */
  unitsIfood: number;
  unitsSite: number;
  /** lucro líquido real acumulado no período (R$). null se sem CPV. */
  profitIfood: number | null;
  profitSite: number | null;
  /** margem % unitária do canal (independe de volume). null se sem CPV. */
  pctIfood: number | null;
  pctSite: number | null;
  /** Se TODAS as vendas iFood deste produto tivessem sido no site (PIX),
   *  quanto a mais renderia no período (R$). null se sem CPV. */
  migrationGain: number | null;
};

export type ChannelProfitSummary = {
  rows: ChannelProfitRow[];
  /** Lucro líquido real do período, por canal (só itens com CPV). */
  totalProfitIfood: number;
  totalProfitSite: number;
  totalProfit: number;
  /** Ganho potencial total migrando as vendas iFood pro site (R$/período). */
  totalMigrationGain: number;
  /** Produtos vendidos sem CPV cadastrado (lucro não calculável). */
  missingCostCount: number;
};

export function buildChannelProfit(orders: Order[], products: Product[]): ChannelProfitSummary {
  const productById = new Map(products.map((p) => [p.id, p]));

  type Agg = { unitsIfood: number; unitsSite: number };
  const byProduct = new Map<string, Agg>();

  for (const o of orders) {
    if (o.status === "CANCELADO") continue;
    const isIfood = o.source === "ifood";
    for (const item of o.items) {
      const agg = byProduct.get(item.productId) ?? { unitsIfood: 0, unitsSite: 0 };
      if (isIfood) agg.unitsIfood += item.qty;
      else agg.unitsSite += item.qty;
      byProduct.set(item.productId, agg);
    }
  }

  const rows: ChannelProfitRow[] = [];
  for (const [productId, a] of byProduct) {
    const product = productById.get(productId);
    const cost = product?.cost ?? 0;
    const hasCost = cost > 0;
    const priceSite = product?.price_site ?? 0;
    const priceIfood = product?.price_ifood ?? 0;

    // Margem unitária por canal (lib/fees aplica a taxa). null se sem CPV.
    const mIfood = channelMargin("ifood", priceIfood, cost);
    const mSite = channelMargin("pix", priceSite, cost);

    const profitIfood = mIfood.profit === null ? null : mIfood.profit * a.unitsIfood;
    const profitSite = mSite.profit === null ? null : mSite.profit * a.unitsSite;

    // Ganho de migração: vendas iFood × (lucro unit. site − lucro unit. iFood).
    const migrationGain =
      mIfood.profit === null || mSite.profit === null
        ? null
        : a.unitsIfood * (mSite.profit - mIfood.profit);

    rows.push({
      productId,
      name: product?.name ?? "(removido)",
      hasCost,
      unitsIfood: a.unitsIfood,
      unitsSite: a.unitsSite,
      profitIfood,
      profitSite,
      pctIfood: mIfood.pct,
      pctSite: mSite.pct,
      migrationGain,
    });
  }

  // Ordena por lucro total real (iFood+site) desc; sem-CPV vão pro fim.
  rows.sort((b, a) => {
    const ta = (a.profitIfood ?? 0) + (a.profitSite ?? 0);
    const tb = (b.profitIfood ?? 0) + (b.profitSite ?? 0);
    return ta - tb;
  });

  const totalProfitIfood = rows.reduce((s, r) => s + (r.profitIfood ?? 0), 0);
  const totalProfitSite = rows.reduce((s, r) => s + (r.profitSite ?? 0), 0);
  const totalMigrationGain = rows.reduce((s, r) => s + (r.migrationGain ?? 0), 0);
  const missingCostCount = rows.filter((r) => !r.hasCost && r.unitsIfood + r.unitsSite > 0).length;

  return {
    rows,
    totalProfitIfood,
    totalProfitSite,
    totalProfit: totalProfitIfood + totalProfitSite,
    totalMigrationGain,
    missingCostCount,
  };
}
