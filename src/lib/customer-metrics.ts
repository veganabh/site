/**
 * Inteligência de cliente a partir de `orders` — RFM + LTV. Funções puras.
 *
 * Identidade = telefone (cobre logado, convidado e iFood, que não têm
 * profile_id). Pedidos CANCELADO são ignorados em receita/frequência/recência
 * (não representam valor realizado).
 */

import type { Order } from "@/types/order";

export type CustomerSegment = "campeao" | "fiel" | "novo" | "em-risco" | "perdido";

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  campeao: "Campeão",
  fiel: "Fiel",
  novo: "Novo",
  "em-risco": "Em risco",
  perdido: "Perdido",
};

export type CustomerStat = {
  phone: string;
  name: string;
  orders: number;
  totalSpent: number;
  avgTicket: number;
  firstOrderAt: string;
  lastOrderAt: string;
  recencyDays: number;
  /** Canais usados. */
  channels: ("site" | "ifood")[];
  segment: CustomerSegment;
};

export type CustomerAnalytics = {
  totalCustomers: number;
  /** % de clientes com 2+ pedidos. 0..1. */
  repeatRate: number;
  totalRevenue: number;
  /** Receita / nº de clientes. */
  avgLtv: number;
  segmentCounts: Record<CustomerSegment, number>;
  customers: CustomerStat[];
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

// ── Scoring (thresholds simples — volume baixo não comporta quintis) ─────────

function scoreRecency(days: number): 1 | 2 | 3 {
  if (days <= 14) return 3;
  if (days <= 45) return 2;
  return 1;
}

function scoreFrequency(orders: number): 1 | 2 | 3 {
  if (orders >= 4) return 3;
  if (orders >= 2) return 2;
  return 1;
}

function scoreMonetary(total: number): 1 | 2 | 3 {
  if (total >= 150) return 3;
  if (total >= 60) return 2;
  return 1;
}

function classify(recencyDays: number, orders: number, total: number): CustomerSegment {
  const r = scoreRecency(recencyDays);
  const f = scoreFrequency(orders);
  const m = scoreMonetary(total);

  // Sumiu (recência baixa)
  if (r === 1) return f >= 2 ? "em-risco" : "perdido";
  // Ativo recente
  if (f === 1) return "novo";
  if (r === 3 && m >= 2) return "campeao";
  return "fiel";
}

/**
 * Agrega pedidos por telefone e classifica em segmentos RFM.
 * @param now Referência de "hoje" (default: agora) — injetável p/ teste.
 */
export function buildCustomerAnalytics(orders: Order[], now: Date = new Date()): CustomerAnalytics {
  const real = orders.filter((o) => o.status !== "CANCELADO" && o.customerPhone);

  const byPhone = new Map<string, Order[]>();
  for (const o of real) {
    const list = byPhone.get(o.customerPhone) ?? [];
    list.push(o);
    byPhone.set(o.customerPhone, list);
  }

  const customers: CustomerStat[] = [];
  for (const [phone, list] of byPhone) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpent = sorted.reduce((sum, o) => sum + o.total, 0);
    const recencyDays = Math.max(0, daysBetween(now, new Date(last.createdAt)));
    const channels = Array.from(new Set(sorted.map((o) => o.source)));

    customers.push({
      phone,
      name: last.customerName || "—",
      orders: sorted.length,
      totalSpent,
      avgTicket: totalSpent / sorted.length,
      firstOrderAt: first.createdAt,
      lastOrderAt: last.createdAt,
      recencyDays,
      channels,
      segment: classify(recencyDays, sorted.length, totalSpent),
    });
  }

  // Ordena por LTV desc (top clientes primeiro)
  customers.sort((a, b) => b.totalSpent - a.totalSpent);

  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.orders >= 2).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const segmentCounts: Record<CustomerSegment, number> = {
    campeao: 0,
    fiel: 0,
    novo: 0,
    "em-risco": 0,
    perdido: 0,
  };
  for (const c of customers) segmentCounts[c.segment]++;

  return {
    totalCustomers,
    repeatRate: totalCustomers > 0 ? repeatCustomers / totalCustomers : 0,
    totalRevenue,
    avgLtv: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
    segmentCounts,
    customers,
  };
}
