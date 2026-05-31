"use client";

/**
 * kits-stats-strip.tsx — Strip compacta de métricas acima da grade de kits.
 *
 * Mesmo padrão visual de `coupons-stats-strip` e da DayStatsStrip de pedidos:
 * 2 pills primárias destacadas (barra leaf) · demais compactas. A economia
 * média usa o ativo estratégico do negócio (premium acessível vs iFood).
 */

import type { GiftKitTemplate } from "@/types/gift-kit";
import { calcKitsMetrics } from "@/lib/kits-metrics";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Pill ────────────────────────────────────────────────────────────────────

type PillProps = {
  label: string;
  value: string;
  hint?: string;
  emphasis?: "default" | "primary";
};

function Pill({ label, value, hint, emphasis = "default" }: PillProps) {
  const isPrimary = emphasis === "primary";

  return (
    <div
      className={cn(
        "relative flex min-w-0 shrink-0 flex-col items-start gap-0 overflow-hidden rounded-sm border text-left",
        isPrimary
          ? "border-olive-900/25 bg-olive-900/[0.04] px-4 py-2 shadow-sm"
          : "border-divider bg-paper-50 px-3 py-1.5",
      )}
    >
      {isPrimary && (
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-1 bg-leaf-500" />
      )}
      <span
        className={cn(
          "text-micro font-semibold tracking-wide uppercase",
          isPrimary ? "text-olive-900" : "text-olive-700",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "leading-tight font-bold text-olive-900",
          isPrimary ? "text-h4" : "text-caption",
        )}
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
    </div>
  );
}

// ── Strip ───────────────────────────────────────────────────────────────────

type KitsStatsStripProps = {
  kits: GiftKitTemplate[];
};

export function KitsStatsStrip({ kits }: KitsStatsStripProps) {
  const m = calcKitsMetrics(kits);

  // Faixa de preço: um valor se min == max, intervalo caso contrário.
  const priceRange =
    m.minPrice === m.maxPrice
      ? formatBRL(m.minPrice)
      : `${formatBRL(m.minPrice)} – ${formatBRL(m.maxPrice)}`;

  return (
    <div role="region" aria-label="Métricas de kits" className="flex flex-wrap items-stretch gap-2">
      <Pill
        label="Kits ativos"
        value={String(m.activeCount)}
        hint={`${m.total} no total`}
        emphasis="primary"
      />
      <Pill
        label="Economia média"
        value={formatBRL(m.avgEconomy)}
        hint="vs iFood"
        emphasis="primary"
      />
      <Pill label="Ticket médio" value={formatBRL(m.avgTicket)} hint="preço de venda" />
      <Pill label="Faixa de preço" value={priceRange} />
      <Pill label="Inativos" value={String(m.inactiveCount)} hint="ocultos do público" />
    </div>
  );
}
