"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DailyRow } from "@/lib/order-insights";

/**
 * Toolbar de relatórios: presets de período + range personalizado (De/Até) +
 * exportar CSV. A filtragem dos dados acontece no servidor (via URL
 * `?period=&from=&to=`); este componente só dirige a navegação e dispara o
 * download do CSV já computado no servidor (passado em `dailySeries`).
 */

const PRESETS = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "all", label: "Tudo" },
] as const;

type RelatoriosToolbarProps = {
  /** Período ativo vindo da URL (preset ou "custom"). */
  activePeriod: string;
  /** Datas do range custom (ISO "YYYY-MM-DD"), quando period=custom. */
  customFrom?: string;
  customTo?: string;
  /** Label legível do range ativo — vira sufixo do nome do arquivo CSV. */
  rangeLabel: string;
  /** Série diária já filtrada pelo servidor — fonte do CSV. */
  dailySeries: DailyRow[];
};

function toChip(active: boolean) {
  return cn(
    "rounded-full border px-2.5 py-0.5 text-micro font-semibold transition-colors",
    active
      ? "border-olive-900 bg-olive-900 text-paper-50"
      : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
  );
}

/** Escapa um campo pra CSV (aspas duplas + envolve se tiver vírgula/quebra). */
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function RelatoriosToolbar({
  activePeriod,
  customFrom,
  customTo,
  rangeLabel,
  dailySeries,
}: RelatoriosToolbarProps) {
  const router = useRouter();
  const isCustom = activePeriod === "custom";
  const [showCustom, setShowCustom] = useState(isCustom);
  const [from, setFrom] = useState(customFrom ?? "");
  const [to, setTo] = useState(customTo ?? "");

  function applyPreset(value: string) {
    setShowCustom(false);
    router.push(`/gestao/relatorios?period=${value}`);
  }

  function applyCustom() {
    if (!from && !to) return;
    const params = new URLSearchParams({ period: "custom" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/gestao/relatorios?${params.toString()}`);
  }

  function exportCsv() {
    const header = ["data", "pedidos", "receita", "ticket_medio"];
    const lines = dailySeries.map((d) =>
      [d.date, d.orders, d.revenue.toFixed(2), d.avgTicket.toFixed(2)].map(csvCell).join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    // BOM (﻿) faz o Excel respeitar UTF-8 (acentos).
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = rangeLabel.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "periodo";
    a.href = url;
    a.download = `relatorio-serie-diaria-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => applyPreset(p.value)}
            className={toChip(!isCustom && activePeriod === p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          aria-expanded={showCustom}
          className={toChip(isCustom)}
        >
          Personalizado
        </button>

        <Button
          variant="secondary"
          size="sm"
          onClick={exportCsv}
          disabled={dailySeries.length === 0}
          title="Exportar a série diária do período filtrado em CSV"
          className="h-8 text-caption"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Exportar CSV
        </Button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end justify-end gap-2 rounded-sm border border-divider bg-paper-50 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
              De
            </span>
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
              Até
            </span>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-9"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            onClick={applyCustom}
            disabled={!from && !to}
            className="h-9"
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}
