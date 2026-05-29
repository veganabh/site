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

export function buildChannelMetrics(orders: Order[]): ChannelMetrics {
  const real = orders.filter((o) => o.status !== "CANCELADO");

  const site = emptyStat();
  const ifood = emptyStat();
  const months = new Map<string, MonthChannel>();

  for (const o of real) {
    const target = o.source === "ifood" ? ifood : site;
    target.orders += 1;
    target.revenue += o.total;

    const key = monthKey(o.createdAt);
    const m =
      months.get(key) ??
      {
        month: key,
        siteRevenue: 0,
        ifoodRevenue: 0,
        siteOrders: 0,
        ifoodOrders: 0,
        siteSharePct: null,
      };
    if (o.source === "ifood") {
      m.ifoodRevenue += o.total;
      m.ifoodOrders += 1;
    } else {
      m.siteRevenue += o.total;
      m.siteOrders += 1;
    }
    months.set(key, m);
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
