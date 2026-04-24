"use client";

/**
 * zones-stats-strip.tsx — Strip compacta de métricas acima do mapa de zonas.
 *
 * Padrão alinhado com /gestao/pedidos, /gestao/cupons, /gestao/cardapio:
 * 2 primários (Zonas ativas + Raio de atendimento) destacados · demais compactos.
 */

import type { DeliveryRing } from "@/types/delivery-ring";
import { calcZonesMetrics, formatRadius } from "@/lib/zones-metrics";
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

type ZonesStatsStripProps = {
  rings: DeliveryRing[];
};

export function ZonesStatsStrip({ rings }: ZonesStatsStripProps) {
  const metrics = calcZonesMetrics(rings);

  return (
    <div
      role="region"
      aria-label="Métricas de zonas de entrega"
      className="flex flex-wrap items-stretch gap-2"
    >
      <Pill
        label="Zonas ativas"
        value={`${metrics.activeCount}/${metrics.total}`}
        hint={`${metrics.coveragePct}% dos anéis`}
        emphasis="primary"
      />
      <Pill
        label="Raio de atendimento"
        value={formatRadius(metrics.maxRadiusM)}
        hint="anel ativo mais externo"
        emphasis="primary"
      />
      <Pill
        label="Taxa média"
        value={metrics.avgFee === 0 ? "—" : formatBRL(metrics.avgFee)}
        hint="nas ativas"
      />
      <Pill
        label="ETA médio"
        value={metrics.avgEtaMin === 0 ? "—" : `${Math.round(metrics.avgEtaMin)} min`}
        hint="nas ativas"
      />
      <Pill label="Inativas" value={String(metrics.total - metrics.activeCount)} />
    </div>
  );
}
