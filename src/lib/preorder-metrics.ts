/**
 * Métricas MENSAIS de encomendas (preorders) — base na data de ENTREGA agendada
 * (encomenda se planeja por mês, não por dia). Funções puras.
 *
 * "Confirmada" = paga (payment_status PAGO) e não cancelada. Encomenda não-paga
 * não é confirmada (ADR 0013) — entra só no contador "aguardando pagamento".
 */

import type { Order } from "@/types/order";

export type PreorderMonthMetrics = {
  /** Soma do total das confirmadas com entrega no mês corrente (R$). */
  revenue: number;
  /** Qtd de confirmadas com entrega no mês. */
  count: number;
  avgTicket: number;
  /** Confirmadas do mês ainda não entregues (backlog de produção). */
  toProduce: number;
  /** Confirmadas a entregar nos próximos 7 dias (qualquer mês) — urgência. */
  next7Days: number;
  /** Não-pagas e não-canceladas (qualquer data) — aguardando confirmação. */
  awaitingPayment: number;
};

/** "YYYY-MM-DD" local a partir de Date (sem shift de fuso). */
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildPreorderMonthMetrics(preorders: Order[], now: Date): PreorderMonthMetrics {
  const monthKey = isoDate(now).slice(0, 7); // "YYYY-MM"
  const todayStr = isoDate(now);
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  const in7Str = isoDate(in7);

  const confirmed = preorders.filter((o) => o.status !== "CANCELADO" && o.paymentStatus === "PAGO");

  const inMonth = confirmed.filter((o) => (o.scheduledDate ?? "").slice(0, 7) === monthKey);

  const revenue = inMonth.reduce((acc, o) => acc + o.total, 0);
  const count = inMonth.length;

  const toProduce = inMonth.filter((o) => o.status !== "ENTREGUE").length;

  const next7Days = confirmed.filter((o) => {
    const d = o.scheduledDate ?? "";
    return d >= todayStr && d <= in7Str && o.status !== "ENTREGUE";
  }).length;

  const awaitingPayment = preorders.filter(
    (o) => o.status !== "CANCELADO" && o.paymentStatus !== "PAGO",
  ).length;

  return {
    revenue,
    count,
    avgTicket: count > 0 ? revenue / count : 0,
    toProduce,
    next7Days,
    awaitingPayment,
  };
}
