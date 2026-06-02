"use client";

/**
 * Strip de métricas MENSAIS de encomendas — espelha a DayStatsStrip dos pedidos
 * do dia, mas com escopo do mês (encomendas se planejam mensalmente).
 *
 * 6 pills: Faturamento (mês) · Encomendas (mês) · Ticket médio · A produzir ·
 * Próx. 7 dias · Aguardando pagamento.
 */

import { CalendarClock } from "lucide-react";
import type { Order } from "@/types/order";
import { buildPreorderMonthMetrics } from "@/lib/preorder-metrics";
import { formatBRL } from "@/lib/format";
import { StatsPill } from "@/components/admin/orders/stats-pill";

export function PreorderStatsStrip({ preorders }: { preorders: Order[] }) {
  const m = buildPreorderMonthMetrics(preorders, new Date());

  return (
    <div
      role="region"
      aria-label="Métricas de encomendas do mês"
      className="flex flex-wrap items-stretch gap-2"
    >
      <StatsPill
        label="Faturamento (mês)"
        value={formatBRL(m.revenue)}
        hint="entregas do mês"
        emphasis="primary"
      />
      <StatsPill
        label="Encomendas (mês)"
        value={String(m.count)}
        hint="confirmadas"
        emphasis="primary"
      />
      <StatsPill label="Ticket médio" value={m.count > 0 ? formatBRL(m.avgTicket) : "—"} />
      <StatsPill
        label="A produzir"
        value={String(m.toProduce)}
        hint={m.toProduce === 0 ? "tudo entregue" : "não entregues"}
      />
      <StatsPill
        label="Próx. 7 dias"
        value={String(m.next7Days)}
        hint={m.next7Days === 0 ? "nada na semana" : "a entregar"}
        tone={m.next7Days > 0 ? "warning" : "default"}
        icon={
          m.next7Days > 0 ? (
            <CalendarClock className="h-3 w-3 text-olive-900" aria-hidden="true" strokeWidth={2} />
          ) : undefined
        }
      />
      <StatsPill
        label="Aguardando pgto"
        value={String(m.awaitingPayment)}
        hint={m.awaitingPayment === 0 ? "nenhuma" : "não confirmadas"}
      />
    </div>
  );
}
