/**
 * Insights operacionais sobre `orders` — filtro de período, pico (dia/hora) e
 * geografia (bairro). Funções puras. Pedidos CANCELADO ignorados em receita.
 */

import type { Order } from "@/types/order";

export const PERIODS = ["7d", "30d", "90d", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "Tudo",
};

export function filterOrdersByPeriod(
  orders: Order[],
  period: Period,
  now: Date = new Date(),
): Order[] {
  if (period === "all") return orders;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = now.getTime() - days * 86_400_000;
  return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
}

// ── Pico (dia da semana + hora) ────────────────────────────────────────────────

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type WeekdayStat = { day: string; orders: number; revenue: number };
export type HourStat = { hour: number; orders: number };

export type TimingMetrics = {
  byWeekday: WeekdayStat[];
  byHour: HourStat[];
  peakWeekday: string | null;
  peakHour: number | null;
  maxWeekdayOrders: number;
  maxHourOrders: number;
};

export function buildTimingMetrics(orders: Order[]): TimingMetrics {
  const real = orders.filter((o) => o.status !== "CANCELADO");

  const byWeekday: WeekdayStat[] = WEEKDAY_NAMES.map((day) => ({ day, orders: 0, revenue: 0 }));
  const byHour: HourStat[] = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));

  for (const o of real) {
    const d = new Date(o.createdAt);
    byWeekday[d.getDay()].orders += 1;
    byWeekday[d.getDay()].revenue += o.total;
    byHour[d.getHours()].orders += 1;
  }

  let peakWeekday: string | null = null;
  let maxWeekdayOrders = 0;
  for (const w of byWeekday) {
    if (w.orders > maxWeekdayOrders) {
      maxWeekdayOrders = w.orders;
      peakWeekday = w.day;
    }
  }

  let peakHour: number | null = null;
  let maxHourOrders = 0;
  for (const h of byHour) {
    if (h.orders > maxHourOrders) {
      maxHourOrders = h.orders;
      peakHour = h.hour;
    }
  }

  return { byWeekday, byHour, peakWeekday, peakHour, maxWeekdayOrders, maxHourOrders };
}

// ── Geografia (por bairro) ──────────────────────────────────────────────────────

export type GeoRow = { neighborhood: string; orders: number; revenue: number };

export function buildGeoMetrics(orders: Order[]): GeoRow[] {
  const real = orders.filter((o) => o.status !== "CANCELADO");
  const byHood = new Map<string, GeoRow>();
  for (const o of real) {
    const hood = o.shippingAddress?.neighborhood?.trim() || "—";
    const row = byHood.get(hood) ?? { neighborhood: hood, orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += o.total;
    byHood.set(hood, row);
  }
  return Array.from(byHood.values()).sort((a, b) => b.orders - a.orders);
}
