"use client";

import * as Slider from "@radix-ui/react-slider";
import { useRingsStore } from "@/stores/rings-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKm(meters: number): string {
  if (meters === 0) return "0 m";
  const km = meters / 1000;
  return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MaxRadiusSlider() {
  const rings = useRingsStore((s) => s.rings);
  const setMaxActiveRadius = useRingsStore((s) => s.setMaxActiveRadius);

  // Valor derivado: maior outerRadiusM entre anéis ativos
  const currentMaxM = Math.max(...rings.filter((r) => r.active).map((r) => r.outerRadiusM), 0);

  const MAX_RANGE = 10_000;
  const STEP = 500;

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
          if (value !== undefined) setMaxActiveRadius(value);
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

      {/* Marcadores de escala */}
      <div className="flex justify-between text-[10px] text-olive-700/70">
        <span>0</span>
        <span>2,5 km</span>
        <span>5 km</span>
        <span>7,5 km</span>
        <span>10 km</span>
      </div>
    </div>
  );
}
