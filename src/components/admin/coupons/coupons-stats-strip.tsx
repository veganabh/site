"use client";

/**
 * coupons-stats-strip.tsx — Strip compacta de métricas acima da tabela de cupons.
 *
 * Padrão alinhado com /gestao/pedidos DayStatsStrip:
 * 2 primários (Ativos + Total usos) destacados · demais compactos.
 */

import type { Coupon } from "@/types/coupon";
import { calcCouponsMetrics } from "@/lib/coupons-metrics";
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
        "relative flex min-w-0 shrink-0 flex-col items-start gap-0 overflow-hidden rounded-md border text-left",
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
          "text-[10px] font-semibold tracking-wide uppercase",
          isPrimary ? "text-olive-900" : "text-olive-700",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-bold leading-tight text-olive-900",
          isPrimary ? "text-h4" : "text-caption",
        )}
      >
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "leading-tight",
            isPrimary ? "text-caption text-olive-700" : "text-[10px] text-olive-700/70",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

// ── Strip ───────────────────────────────────────────────────────────────────

type CouponsStatsStripProps = {
  coupons: Coupon[];
};

export function CouponsStatsStrip({ coupons }: CouponsStatsStripProps) {
  const metrics = calcCouponsMetrics(coupons);

  return (
    <div role="region" aria-label="Métricas de cupons" className="flex flex-wrap items-stretch gap-2">
      <Pill
        label="Cupons ativos"
        value={String(metrics.activeCount)}
        hint={`${coupons.length} no total`}
        emphasis="primary"
      />
      <Pill
        label="Total de usos"
        value={String(metrics.totalUses)}
        hint="acumulado"
        emphasis="primary"
      />
      <Pill label="Expirados" value={String(metrics.expiredCount)} />
      <Pill label="Inativos" value={String(metrics.inactiveCount)} />
      <Pill
        label="Uso médio"
        value={metrics.avgUsagePct === 0 ? "—" : `${metrics.avgUsagePct}%`}
        hint="sobre limite"
      />
    </div>
  );
}
