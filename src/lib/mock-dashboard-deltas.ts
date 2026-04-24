/**
 * mock-dashboard-deltas.ts — snapshot fake de "ontem" para comparação de métricas.
 *
 * Usado exclusivamente antes da integração com Supabase.
 * Quando a query real de "ontem" existir, este arquivo pode ser removido —
 * o hook useDashboardMetrics() passará a calcular o dia anterior diretamente.
 *
 * Valores escolhidos para representar um dia típico da confeitaria (R$ 8–10k/mês).
 */

import type { DayMetrics } from "@/lib/dashboard-metrics";

/**
 * Métricas do dia anterior (ontem) — mock pré-computado.
 *
 * Para substituição futura: query Supabase filtrando orders onde
 * `date_trunc('day', created_at) = current_date - interval '1 day'`
 * e calcular via calcDayMetrics().
 */
export const YESTERDAY_METRICS: DayMetrics = {
  revenue: 312.4,
  orderCount: 7,
  avgTicket: 44.63,
  cancelCount: 0,
};
