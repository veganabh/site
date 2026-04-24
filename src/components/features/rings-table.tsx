"use client";

import { useEffect, useRef } from "react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useRingsStore } from "@/stores/rings-store";
import type { DeliveryRing } from "@/types/delivery-ring";

// ─── Props ────────────────────────────────────────────────────────────────────

type RingsTableProps = {
  highlightedId?: string;
};

// ─── Linha editável ───────────────────────────────────────────────────────────

type RingRowProps = {
  ring: DeliveryRing;
  isHighlighted: boolean;
  updateRing: (id: string, patch: Partial<DeliveryRing>) => void;
};

function RingRow({ ring, isHighlighted, updateRing }: RingRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Scroll into view quando destacada pelo clique no mapa
  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-divider text-body-sm transition-colors",
        isHighlighted
          ? "bg-olive-900/8 outline outline-1 outline-olive-900/40"
          : "hover:bg-paper-100",
      )}
    >
      {/* Anel */}
      <td className="py-2 pr-2 pl-3 font-semibold text-olive-900 tabular-nums">{ring.order}</td>

      {/* Raio */}
      <td className="px-2 py-2 text-olive-700">{ring.label}</td>

      {/* Taxa */}
      <td className="px-2 py-2">
        <label className="sr-only" htmlFor={`fee-${ring.id}`}>
          Taxa de entrega do anel {ring.order}
        </label>
        <div className="flex items-center gap-1">
          <span className="text-olive-700">R$</span>
          <input
            id={`fee-${ring.id}`}
            type="number"
            min={0}
            max={50}
            step={0.5}
            value={ring.fee}
            onChange={(e) => updateRing(ring.id, { fee: parseFloat(e.target.value) || 0 })}
            className="w-14 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-[12px] text-olive-900 focus:border-olive-700 focus:outline-none"
          />
        </div>
      </td>

      {/* ETA mín */}
      <td className="px-2 py-2">
        <label className="sr-only" htmlFor={`eta-min-${ring.id}`}>
          Tempo mínimo de entrega (min) do anel {ring.order}
        </label>
        <input
          id={`eta-min-${ring.id}`}
          type="number"
          min={5}
          max={120}
          step={5}
          value={ring.etaMin}
          onChange={(e) => updateRing(ring.id, { etaMin: parseInt(e.target.value, 10) || 0 })}
          className="w-12 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-[12px] text-olive-900 focus:border-olive-700 focus:outline-none"
        />
      </td>

      {/* ETA máx */}
      <td className="px-2 py-2">
        <label className="sr-only" htmlFor={`eta-max-${ring.id}`}>
          Tempo máximo de entrega (min) do anel {ring.order}
        </label>
        <input
          id={`eta-max-${ring.id}`}
          type="number"
          min={5}
          max={180}
          step={5}
          value={ring.etaMax}
          onChange={(e) => updateRing(ring.id, { etaMax: parseInt(e.target.value, 10) || 0 })}
          className="w-12 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-[12px] text-olive-900 focus:border-olive-700 focus:outline-none"
        />
      </td>

      {/* Ativo */}
      <td className="py-2 pr-3 pl-2 text-center">
        <Switch.Root
          checked={ring.active}
          onCheckedChange={(checked: boolean) => updateRing(ring.id, { active: checked })}
          aria-label={`Anel ${ring.order} ${ring.active ? "ativo" : "inativo"}`}
          className={cn(
            "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive-500",
            ring.active ? "bg-olive-900" : "bg-olive-900/20",
          )}
        >
          <Switch.Thumb
            className={cn(
              "block h-4 w-4 rounded-full bg-paper-50 shadow-sm transition-transform",
              ring.active ? "translate-x-[18px]" : "translate-x-0.5",
            )}
          />
        </Switch.Root>
      </td>
    </tr>
  );
}

// ─── Tabela ───────────────────────────────────────────────────────────────────

export function RingsTable({ highlightedId }: RingsTableProps) {
  const rings = useRingsStore((s) => s.rings);
  const updateRing = useRingsStore((s) => s.updateRing);
  const resetToDefaults = useRingsStore((s) => s.resetToDefaults);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-semibold text-olive-900">Anéis de entrega</h3>
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-[11px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
        >
          Restaurar padrões
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-divider">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-divider bg-paper-100">
              <th className="py-2 pr-2 pl-3 text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                Anel
              </th>
              <th className="px-2 py-2 text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                Raio
              </th>
              <th className="px-2 py-2 text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                Taxa
              </th>
              <th className="px-2 py-2 text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                ETA mín
              </th>
              <th className="px-2 py-2 text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                ETA máx
              </th>
              <th className="py-2 pr-3 pl-2 text-center text-[11px] font-bold tracking-wide text-olive-700 uppercase">
                Ativo
              </th>
            </tr>
          </thead>
          <tbody>
            {rings.map((ring) => (
              <RingRow
                key={ring.id}
                ring={ring}
                isHighlighted={ring.id === highlightedId}
                updateRing={updateRing}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda rápida */}
      <p className="text-[11px] text-olive-700">
        ETA em minutos · Taxa em R$ · Altera ao salvar (sem reload).
      </p>
    </div>
  );
}
