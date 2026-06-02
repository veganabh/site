"use client";

/**
 * day-stats-strip.tsx — Strip horizontal compacta acima do Kanban de pedidos.
 *
 * Seis pills densas do dia corrente:
 *   1. Faturamento (soma total dos pedidos do dia, excluindo cancelados)
 *   2. Pedidos (contagem ativa do dia)
 *   3. Ticket médio
 *   4. Tempo médio de preparo (history PREPARANDO → PRONTO)
 *   5. Taxa de aceite (accepted/total)
 *   6. Parados >30min — clicável (toggle filtro Kanban)
 *
 * Client Component porque a pill "Parados" precisa de estado clicável e timer
 * decorrido é time-sensitive (re-render a cada 30s via tick do elapsed).
 * O recálculo é barato (≤20 pedidos/dia no mock), roda inline no render.
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Order } from "@/types/order";
import {
  calcDayMetrics,
  calcAvgPrepMinutes,
  calcAcceptanceRate,
  countDelayedOrders,
} from "@/lib/dashboard-metrics";
import { StatsPill, type StatsPillProps } from "@/components/admin/orders/stats-pill";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Strip ───────────────────────────────────────────────────────────────────

type DayStatsStripProps = {
  orders: Order[];
  /** Se o filtro "só atrasados" está ativo (controlado pelo pai). */
  onlyDelayedActive: boolean;
  /** Toggle do filtro — chamado ao clicar na pill "Parados". */
  onToggleOnlyDelayed: () => void;
};

export function DayStatsStrip({
  orders,
  onlyDelayedActive,
  onToggleOnlyDelayed,
}: DayStatsStripProps) {
  // Timer de 30s força recálculo de `countDelayedOrders` (depende de Date.now)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const metrics = calcDayMetrics(orders, today);
  const avgPrep = calcAvgPrepMinutes(orders, today);
  const acceptance = calcAcceptanceRate(orders, today);
  const delayed = countDelayedOrders(orders, 30);

  // Tom da pill "Tempo médio preparo" conforme threshold
  const prepTone: StatsPillProps["tone"] =
    avgPrep === null ? "default" : avgPrep >= 35 ? "danger" : avgPrep >= 25 ? "warning" : "default";

  return (
    <div role="region" aria-label="Métricas do dia" className="flex flex-wrap items-stretch gap-2">
      <StatsPill
        label="Faturamento"
        value={formatBRL(metrics.revenue)}
        hint="excl. cancelados"
        emphasis="primary"
      />

      <StatsPill
        label="Pedidos"
        value={String(metrics.orderCount)}
        hint={metrics.cancelCount > 0 ? `${metrics.cancelCount} cancel.` : "no dia"}
        emphasis="primary"
      />

      <StatsPill
        label="Ticket médio"
        value={metrics.orderCount > 0 ? formatBRL(metrics.avgTicket) : "—"}
      />

      <StatsPill
        label="Tempo preparo"
        value={avgPrep === null ? "—" : `${avgPrep} min`}
        hint={avgPrep === null ? "sem dados" : "média do dia"}
        tone={prepTone}
      />

      <StatsPill
        label="Taxa aceite"
        value={acceptance.total === 0 ? "—" : `${acceptance.accepted}/${acceptance.total}`}
        hint={
          acceptance.total === 0
            ? "sem pedidos"
            : `${Math.round((acceptance.accepted / acceptance.total) * 100)}%`
        }
      />

      <StatsPill
        label="Parados >30min"
        value={String(delayed)}
        hint={delayed === 0 ? "tudo em dia" : "clique p/ filtrar"}
        tone={delayed > 0 ? "danger" : "default"}
        icon={
          delayed > 0 ? (
            <AlertTriangle className="h-3 w-3 text-terra-700" aria-hidden="true" strokeWidth={2} />
          ) : undefined
        }
        onClick={delayed > 0 ? onToggleOnlyDelayed : undefined}
        active={onlyDelayedActive}
        disabled={delayed === 0}
      />
    </div>
  );
}
