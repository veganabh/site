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
import { cn } from "@/lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Pill ────────────────────────────────────────────────────────────────────

type PillProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
  /**
   * Destaque de KPI principal. `primary` = Faturamento/Pedidos (blocos maiores,
   * valor em text-h4, bg olive discreto, accent leaf na lateral). `default` = demais.
   */
  emphasis?: "default" | "primary";
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
};

function Pill({
  label,
  value,
  hint,
  tone = "default",
  emphasis = "default",
  icon,
  onClick,
  active,
  disabled,
}: PillProps) {
  const clickable = !!onClick && !disabled;
  const isPrimary = emphasis === "primary";

  const toneBorder =
    tone === "danger"
      ? "border-terra-500/40"
      : tone === "warning"
        ? "border-warning/40"
        : isPrimary
          ? "border-olive-900/25"
          : "border-divider";

  const toneValue =
    tone === "danger" ? "text-terra-700" : tone === "warning" ? "text-olive-900" : "text-olive-900";

  return (
    <button
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      disabled={disabled}
      aria-pressed={clickable ? active : undefined}
      className={cn(
        "relative flex min-w-0 shrink-0 flex-col items-start gap-0 overflow-hidden rounded-sm border text-left transition",
        toneBorder,
        isPrimary ? "bg-olive-900/[0.04] px-4 py-2 shadow-sm" : "bg-paper-50 px-3 py-1.5",
        clickable &&
          "cursor-pointer hover:border-olive-900 focus:border-olive-900 focus:outline-none",
        active && "border-olive-900 bg-olive-900/5 shadow-sm",
        !clickable && "cursor-default",
      )}
    >
      {/* Barra lateral de destaque (KPIs primários) */}
      {isPrimary && (
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-1 bg-leaf-500" />
      )}
      <span
        className={cn(
          "flex items-center gap-1 text-micro font-semibold tracking-wide uppercase",
          // WCAG AA: label em olive-900 sólido sobre bg-olive-900/[0.04] → contraste bem acima de 4.5:1
          isPrimary ? "text-olive-900" : "text-olive-700",
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={cn("leading-tight font-bold", isPrimary ? "text-h4" : "text-caption", toneValue)}
      >
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "leading-tight",
            isPrimary ? "text-caption text-olive-700" : "text-micro text-olive-700",
          )}
        >
          {hint}
        </span>
      )}
    </button>
  );
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
  const prepTone: PillProps["tone"] =
    avgPrep === null ? "default" : avgPrep >= 35 ? "danger" : avgPrep >= 25 ? "warning" : "default";

  return (
    <div role="region" aria-label="Métricas do dia" className="flex flex-wrap items-stretch gap-2">
      <Pill
        label="Faturamento"
        value={formatBRL(metrics.revenue)}
        hint="excl. cancelados"
        emphasis="primary"
      />

      <Pill
        label="Pedidos"
        value={String(metrics.orderCount)}
        hint={metrics.cancelCount > 0 ? `${metrics.cancelCount} cancel.` : "no dia"}
        emphasis="primary"
      />

      <Pill
        label="Ticket médio"
        value={metrics.orderCount > 0 ? formatBRL(metrics.avgTicket) : "—"}
      />

      <Pill
        label="Tempo preparo"
        value={avgPrep === null ? "—" : `${avgPrep} min`}
        hint={avgPrep === null ? "sem dados" : "média do dia"}
        tone={prepTone}
      />

      <Pill
        label="Taxa aceite"
        value={acceptance.total === 0 ? "—" : `${acceptance.accepted}/${acceptance.total}`}
        hint={
          acceptance.total === 0
            ? "sem pedidos"
            : `${Math.round((acceptance.accepted / acceptance.total) * 100)}%`
        }
      />

      <Pill
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
