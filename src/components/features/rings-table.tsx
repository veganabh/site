"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { useRingsStore } from "@/stores/rings-store";
import { resetRingsToDefaultsAction, updateRingAction } from "@/server/actions/rings";
import type { DeliveryRing } from "@/types/delivery-ring";

// ─── Props ────────────────────────────────────────────────────────────────────

type RingsTableProps = {
  highlightedId?: string;
  onMutationSuccess: () => void;
  onMutationError: (message: string) => void;
};

// ─── Linha editável ───────────────────────────────────────────────────────────

type RingRowProps = {
  ring: DeliveryRing;
  isHighlighted: boolean;
  onUpdate: (id: string, patch: Partial<DeliveryRing>) => void;
};

function RingRow({ ring, isHighlighted, onUpdate }: RingRowProps) {
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
      <td className="py-2 pr-2 pl-3 font-semibold text-olive-900 tabular-nums">{ring.order}</td>

      <td className="px-2 py-2 text-olive-700">{ring.label}</td>

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
            onChange={(e) => onUpdate(ring.id, { fee: parseFloat(e.target.value) || 0 })}
            className="w-14 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-caption text-olive-900 focus:border-olive-700 focus:outline-none"
          />
        </div>
      </td>

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
          onChange={(e) => onUpdate(ring.id, { etaMin: parseInt(e.target.value, 10) || 0 })}
          className="w-12 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-caption text-olive-900 focus:border-olive-700 focus:outline-none"
        />
      </td>

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
          onChange={(e) => onUpdate(ring.id, { etaMax: parseInt(e.target.value, 10) || 0 })}
          className="w-12 rounded-sm border border-olive-900/20 bg-paper-50 px-1.5 py-0.5 text-right text-caption text-olive-900 focus:border-olive-700 focus:outline-none"
        />
      </td>

      <td className="py-2 pr-3 pl-2 text-center">
        <Switch.Root
          checked={ring.active}
          onCheckedChange={(checked: boolean) => onUpdate(ring.id, { active: checked })}
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

const DEBOUNCE_MS = 600;

export function RingsTable({ highlightedId, onMutationSuccess, onMutationError }: RingsTableProps) {
  const rings = useRingsStore((s) => s.rings);
  const setRings = useRingsStore((s) => s.setRings);
  const applyOptimisticUpdate = useRingsStore((s) => s.applyOptimisticUpdate);
  const [, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);

  // Buffer de patches pendentes por ring — debounce evita uma server action
  // a cada keystroke nos inputs de fee/etaMin/etaMax.
  const pendingPatchesRef = useRef<Map<string, Partial<DeliveryRing>>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushPendingPatches() {
    const entries = Array.from(pendingPatchesRef.current.entries());
    pendingPatchesRef.current.clear();
    if (entries.length === 0) return;

    const snapshot = useRingsStore.getState().rings;

    startTransition(async () => {
      const results = await Promise.all(
        entries.map(([id, patch]) =>
          updateRingAction(id, {
            fee: patch.fee,
            etaMin: patch.etaMin,
            etaMax: patch.etaMax,
            active: patch.active,
          }),
        ),
      );
      const failure = results.find((r) => !r.ok);
      if (failure && !failure.ok) {
        setRings(snapshot);
        onMutationError(failure.message);
        return;
      }
      onMutationSuccess();
    });
  }

  function handleUpdate(id: string, patch: Partial<DeliveryRing>) {
    applyOptimisticUpdate(id, patch);
    const merged = { ...(pendingPatchesRef.current.get(id) ?? {}), ...patch };
    pendingPatchesRef.current.set(id, merged);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushPendingPatches, DEBOUNCE_MS);
  }

  function handleReset() {
    if (resetting) return;
    setResetting(true);
    startTransition(async () => {
      const result = await resetRingsToDefaultsAction();
      setResetting(false);
      if (!result.ok) {
        onMutationError(result.message);
        return;
      }
      onMutationSuccess();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-semibold text-olive-900">Anéis de entrega</h3>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="text-micro font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900 disabled:opacity-60"
        >
          {resetting ? "Restaurando..." : "Restaurar padrões"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-divider">
        <table className="w-full min-w-[480px] border-collapse text-left">
          <thead>
            <tr className="border-b border-divider bg-paper-100">
              <th className="py-2 pr-2 pl-3 text-micro font-bold tracking-wide text-olive-700 uppercase">
                Anel
              </th>
              <th className="px-2 py-2 text-micro font-bold tracking-wide text-olive-700 uppercase">
                Raio
              </th>
              <th className="px-2 py-2 text-micro font-bold tracking-wide text-olive-700 uppercase">
                Taxa
              </th>
              <th className="px-2 py-2 text-micro font-bold tracking-wide text-olive-700 uppercase">
                ETA mín
              </th>
              <th className="px-2 py-2 text-micro font-bold tracking-wide text-olive-700 uppercase">
                ETA máx
              </th>
              <th className="py-2 pr-3 pl-2 text-center text-micro font-bold tracking-wide text-olive-700 uppercase">
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
                onUpdate={handleUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-micro text-olive-700">
        ETA em minutos · Taxa em R$ · Salva automaticamente.
      </p>
    </div>
  );
}
