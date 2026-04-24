/**
 * day-stats-grid.tsx — Grid de estatísticas do dia com hierarquia visual.
 *
 * Server Component: recebe métricas já calculadas como props.
 * Os valores de "ontem" (deltas) vêm do mock-dashboard-deltas até integração Supabase.
 *
 * Hierarquia (alinhado com /gestao/pedidos DayStatsStrip):
 *   - Primários: Receita + Pedidos (bg olive-900/[0.04], border-leaf accent, text-h4)
 *   - Secundários: Ticket médio + Cancelados (compactos)
 */

import { cn } from "@/lib/utils";
import { formatDelta, isDeltaPositive } from "@/lib/dashboard-metrics";
import type { DayMetrics } from "@/lib/dashboard-metrics";

type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  /** Se true, delta negativo é exibido em cor neutra (ex: cancelados — menos é melhor). */
  invertDelta?: boolean;
  /** Destaque KPI primário (bg olive sutil, accent leaf lateral, valor maior). */
  emphasis?: "primary" | "default";
};

function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  invertDelta,
  emphasis = "default",
}: StatCardProps) {
  const positive = invertDelta ? !deltaPositive : deltaPositive;
  const isPrimary = emphasis === "primary";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 overflow-hidden rounded-lg border shadow-sm",
        isPrimary
          ? "border-olive-900/25 bg-olive-900/[0.04] px-5 py-4"
          : "border-divider bg-paper-50 p-4",
      )}
    >
      {isPrimary && (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-1 bg-leaf-500"
        />
      )}
      <span
        className={cn(
          "text-caption font-semibold tracking-wide uppercase",
          isPrimary ? "text-olive-900" : "text-olive-700",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-bold text-olive-900",
          isPrimary ? "text-price-big" : "text-h4",
        )}
      >
        {value}
      </span>
      {delta && delta !== "—" ? (
        <span
          className={cn(
            "text-caption font-semibold",
            positive ? "text-leaf-700" : "text-terra-700",
          )}
        >
          {delta} vs ontem
        </span>
      ) : (
        <span className="text-caption text-olive-700/70">—</span>
      )}
    </div>
  );
}

type DayStatsGridProps = {
  today: DayMetrics;
  yesterday: DayMetrics;
};

/** Formata valor monetário: "R$ 312,40". */
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DayStatsGrid({ today, yesterday }: DayStatsGridProps) {
  return (
    <div aria-label="Resumo financeiro do dia" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        label="Receita hoje"
        value={formatBRL(today.revenue)}
        delta={formatDelta(today.revenue, yesterday.revenue)}
        deltaPositive={isDeltaPositive(today.revenue, yesterday.revenue)}
        emphasis="primary"
      />
      <StatCard
        label="Pedidos hoje"
        value={String(today.orderCount)}
        delta={formatDelta(today.orderCount, yesterday.orderCount)}
        deltaPositive={isDeltaPositive(today.orderCount, yesterday.orderCount)}
        emphasis="primary"
      />
      <StatCard
        label="Ticket médio"
        value={today.orderCount > 0 ? formatBRL(today.avgTicket) : "—"}
        delta={formatDelta(today.avgTicket, yesterday.avgTicket)}
        deltaPositive={isDeltaPositive(today.avgTicket, yesterday.avgTicket)}
      />
      <StatCard
        label="Cancelados hoje"
        value={String(today.cancelCount)}
        delta={
          today.cancelCount === 0 && yesterday.cancelCount === 0
            ? undefined
            : formatDelta(today.cancelCount, yesterday.cancelCount)
        }
        deltaPositive={isDeltaPositive(today.cancelCount, yesterday.cancelCount)}
        invertDelta
      />
    </div>
  );
}
