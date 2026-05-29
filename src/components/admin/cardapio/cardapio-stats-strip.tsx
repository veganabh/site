"use client";

/**
 * cardapio-stats-strip.tsx — Strip compacta de métricas acima da lista de produtos.
 *
 * Padrão alinhado com /gestao/pedidos DayStatsStrip e /gestao/cupons CouponsStatsStrip:
 * 2 primários (Ativos + Valor em estoque) destacados · demais compactos.
 */

import type { Product } from "@/types/product";
import { calcMenuMetrics } from "@/lib/menu-metrics";
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
            isPrimary ? "text-caption text-olive-700" : "text-micro text-olive-700/70",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

// ── Strip ───────────────────────────────────────────────────────────────────

type CardapioStatsStripProps = {
  products: Product[];
};

export function CardapioStatsStrip({ products }: CardapioStatsStripProps) {
  const metrics = calcMenuMetrics(products);

  return (
    <div
      role="region"
      aria-label="Métricas de cardápio"
      className="flex flex-wrap items-stretch gap-2"
    >
      <Pill
        label="Produtos ativos"
        value={String(metrics.activeCount)}
        hint={`${metrics.total} no total`}
        emphasis="primary"
      />
      <Pill
        label="Valor em estoque"
        value={formatBRL(metrics.stockValue)}
        hint="ativos × preço site"
        emphasis="primary"
      />
      <Pill label="Esgotados" value={String(metrics.exhaustedCount)} />
      <Pill label="Estoque baixo" value={String(metrics.lowStockCount)} />
      <Pill label="Total em estoque" value={String(metrics.totalStockUnits)} hint="unidades" />
    </div>
  );
}
