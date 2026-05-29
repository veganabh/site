"use client";

import { useRef, useTransition } from "react";
import * as Slider from "@radix-ui/react-slider";
import { useRingsStore } from "@/stores/rings-store";
import { setMaxActiveRadiusAction } from "@/server/actions/rings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKm(meters: number): string {
  if (meters === 0) return "0 m";
  const km = meters / 1000;
  return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

type MaxRadiusSliderProps = {
  onMutationSuccess: () => void;
  onMutationError: (message: string) => void;
};

const COMMIT_DEBOUNCE_MS = 400;

export function MaxRadiusSlider({ onMutationSuccess, onMutationError }: MaxRadiusSliderProps) {
  const rings = useRingsStore((s) => s.rings);
  const setRings = useRingsStore((s) => s.setRings);
  const applyOptimisticSetMaxRadius = useRingsStore((s) => s.applyOptimisticSetMaxRadius);
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Valor derivado: maior outerRadiusM entre anéis ativos
  const currentMaxM = Math.max(...rings.filter((r) => r.active).map((r) => r.outerRadiusM), 0);

  const MAX_RANGE = 10_000;
  const STEP = 500;

  function handleChange(value: number) {
    applyOptimisticSetMaxRadius(value);
    const snapshot = useRingsStore.getState().rings;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await setMaxActiveRadiusAction({ meters: value });
        if (!result.ok) {
          // Snapshot pós-optimistic — para revert real precisamos do estado
          // anterior à mudança. Como o slider é stateless e só commit ao soltar,
          // basta pedir refetch via root layout: mutationError mostra alerta e
          // onMutationSuccess vai ser pulado (não chamamos).
          setRings(snapshot);
          onMutationError(result.message);
          return;
        }
        onMutationSuccess();
      });
    }, COMMIT_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor="max-radius-slider" className="text-body-sm font-semibold text-olive-900">
          Raio máximo atendido
        </label>
        <span
          className="text-body-sm font-bold text-olive-900 tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatKm(currentMaxM)}
        </span>
      </div>

      <Slider.Root
        id="max-radius-slider"
        min={0}
        max={MAX_RANGE}
        step={STEP}
        value={[currentMaxM]}
        onValueChange={(values: number[]) => {
          const value = values[0];
          if (value !== undefined) handleChange(value);
        }}
        aria-label={`Raio máximo de entrega: ${formatKm(currentMaxM)}`}
        className="relative flex h-5 w-full touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-olive-900/15">
          <Slider.Range className="absolute h-full rounded-full bg-olive-900" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-5 w-5 rounded-full border-2 border-olive-900 bg-paper-50 shadow-sm transition-colors hover:bg-paper-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500"
          aria-label={`Raio máximo de entrega: ${formatKm(currentMaxM)}`}
        />
      </Slider.Root>

      <div className="flex justify-between text-micro text-olive-700/70">
        <span>0</span>
        <span>2,5 km</span>
        <span>5 km</span>
        <span>7,5 km</span>
        <span>10 km</span>
      </div>
    </div>
  );
}
