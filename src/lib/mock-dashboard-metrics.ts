/**
 * Métricas do dashboard operacional — hardcoded para pré-migração.
 *
 * Pós-migração: substituir por queries ao Supabase (aggregates sobre a
 * tabela `orders` filtrada por `created_at` e `source`).
 * A interface DayMetrics / WeekMetrics permanece a mesma para os widgets.
 */

export type DayMetrics = {
  /** ISO date string. Ex: "2026-04-22". */
  date: string;
  ordersCount: number;
  /** Receita total do dia (site + iFood). */
  revenue: number;
  revenueSite: number;
  revenueIfood: number;
  /** revenue / ordersCount. 0 se ordersCount === 0. */
  avgTicket: number;
  /** Pedidos com status NOVO aguardando ação da admin. */
  newOrdersCount: number;
  /** Produtos com stock <= lowStockThreshold. */
  criticalStockCount: number;
};

export type WeekMetrics = {
  /** 7 entradas: seg (índice 0) a dom (índice 6). */
  days: DayMetrics[];
  totalRevenue: number;
  totalRevenueSite: number;
  totalRevenueIfood: number;
};

// ── Dados hardcoded semana 20–26 abr 2026 ────────────────────────────────────

type RawDay = Omit<DayMetrics, "avgTicket">;

const WEEK_RAW: RawDay[] = [
  {
    date: "2026-04-20",
    ordersCount: 8,
    revenue: 340,
    revenueSite: 220,
    revenueIfood: 120,
    newOrdersCount: 0,
    criticalStockCount: 2,
  },
  {
    date: "2026-04-21",
    ordersCount: 5,
    revenue: 210,
    revenueSite: 130,
    revenueIfood: 80,
    newOrdersCount: 0,
    criticalStockCount: 2,
  },
  {
    date: "2026-04-22",
    ordersCount: 12,
    revenue: 520,
    revenueSite: 350,
    revenueIfood: 170,
    newOrdersCount: 2,
    criticalStockCount: 3,
  },
  {
    date: "2026-04-23",
    ordersCount: 7,
    revenue: 295,
    revenueSite: 190,
    revenueIfood: 105,
    newOrdersCount: 0,
    criticalStockCount: 1,
  },
  {
    date: "2026-04-24",
    ordersCount: 15,
    revenue: 680,
    revenueSite: 460,
    revenueIfood: 220,
    newOrdersCount: 0,
    criticalStockCount: 1,
  },
  {
    date: "2026-04-25",
    ordersCount: 18,
    revenue: 810,
    revenueSite: 580,
    revenueIfood: 230,
    newOrdersCount: 0,
    criticalStockCount: 0,
  },
  {
    date: "2026-04-26",
    ordersCount: 0,
    revenue: 0,
    revenueSite: 0,
    revenueIfood: 0,
    newOrdersCount: 0,
    criticalStockCount: 0,
  },
];

function withAvgTicket(raw: RawDay): DayMetrics {
  return {
    ...raw,
    avgTicket: raw.ordersCount > 0 ? parseFloat((raw.revenue / raw.ordersCount).toFixed(2)) : 0,
  };
}

const WEEK_METRICS: WeekMetrics = (() => {
  const days = WEEK_RAW.map(withAvgTicket);
  return {
    days,
    totalRevenue: days.reduce((s, d) => s + d.revenue, 0),
    totalRevenueSite: days.reduce((s, d) => s + d.revenueSite, 0),
    totalRevenueIfood: days.reduce((s, d) => s + d.revenueIfood, 0),
  };
})();

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Retorna as métricas do dia informado (ISO date string).
 * Se o dia não estiver nos dados mock, retorna zeros.
 * Default: hoje (2026-04-22).
 */
export function getMockDayMetrics(date = "2026-04-22"): DayMetrics {
  return (
    WEEK_METRICS.days.find((d) => d.date === date) ?? {
      date,
      ordersCount: 0,
      revenue: 0,
      revenueSite: 0,
      revenueIfood: 0,
      avgTicket: 0,
      newOrdersCount: 0,
      criticalStockCount: 0,
    }
  );
}

/**
 * Retorna as métricas da semana corrente (seg 2026-04-20 a dom 2026-04-26).
 */
export function getMockWeekMetrics(): WeekMetrics {
  return WEEK_METRICS;
}
