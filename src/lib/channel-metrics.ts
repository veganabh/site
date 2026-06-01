/**
 * Métricas de canal (site próprio vs iFood) — mede a migração do iFood pro
 * canal próprio, objetivo central do negócio. Funções puras sobre `orders`.
 *
 * Pedidos CANCELADO são ignorados (sem receita realizada).
 */

import type { Order } from "@/types/order";

export type ChannelStat = {
  orders: number;
  revenue: number;
  avgTicket: number;
};

export type MonthChannel = {
  /** "YYYY-MM" */
  month: string;
  siteRevenue: number;
  ifoodRevenue: number;
  siteOrders: number;
  ifoodOrders: number;
  /** receita site / receita total do mês (0..1). null se mês sem receita. */
  siteSharePct: number | null;
};

export type ChannelMetrics = {
  site: ChannelStat;
  ifood: ChannelStat;
  totalRevenue: number;
  /** receita site / receita total geral (0..1). null se sem receita. */
  siteSharePct: number | null;
  byMonth: MonthChannel[];
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptyStat(): ChannelStat {
  return { orders: 0, revenue: 0, avgTicket: 0 };
}

/** Receita iFood importada (ADR 0012), agregada por mês. */
export type IfoodRevenueInput = {
  totalRevenue: number;
  byMonth: { month: string; revenue: number }[];
  /** nº de pedidos reais (financeiro/P1). Sem isso, fica sem ticket (itens/P0). */
  orders?: number;
};

export function buildChannelMetrics(
  orders: Order[],
  ifoodInput?: IfoodRevenueInput,
): ChannelMetrics {
  const real = orders.filter((o) => o.status !== "CANCELADO");

  const site = emptyStat();
  const ifood = emptyStat();
  const months = new Map<string, MonthChannel>();

  function monthBucket(key: string): MonthChannel {
    const m = months.get(key) ?? {
      month: key,
      siteRevenue: 0,
      ifoodRevenue: 0,
      siteOrders: 0,
      ifoodOrders: 0,
      siteSharePct: null,
    };
    months.set(key, m);
    return m;
  }

  // Com snapshot iFood, a receita iFood vem dele — ignora pedidos source='ifood'
  // nos orders pra não contar duas vezes.
  const useSnapshot = ifoodInput !== undefined;

  for (const o of real) {
    const isIfood = o.source === "ifood";
    if (isIfood && useSnapshot) continue;
    const target = isIfood ? ifood : site;
    target.orders += 1;
    target.revenue += o.total;

    const m = monthBucket(monthKey(o.createdAt));
    if (isIfood) {
      m.ifoodRevenue += o.total;
      m.ifoodOrders += 1;
    } else {
      m.siteRevenue += o.total;
      m.siteOrders += 1;
    }
  }

  // Injeta receita iFood importada. nº de pedidos só com o financeiro (P1).
  if (ifoodInput) {
    ifood.revenue += ifoodInput.totalRevenue;
    if (ifoodInput.orders !== undefined) ifood.orders += ifoodInput.orders;
    for (const { month, revenue } of ifoodInput.byMonth) {
      monthBucket(month).ifoodRevenue += revenue;
    }
  }

  site.avgTicket = site.orders > 0 ? site.revenue / site.orders : 0;
  ifood.avgTicket = ifood.orders > 0 ? ifood.revenue / ifood.orders : 0;

  const totalRevenue = site.revenue + ifood.revenue;

  const byMonth = Array.from(months.values())
    .map((m) => {
      const monthTotal = m.siteRevenue + m.ifoodRevenue;
      return { ...m, siteSharePct: monthTotal > 0 ? m.siteRevenue / monthTotal : null };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    site,
    ifood,
    totalRevenue,
    siteSharePct: totalRevenue > 0 ? site.revenue / totalRevenue : null,
    byMonth,
  };
}
