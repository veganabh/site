"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRingsStore } from "@/stores/rings-store";
import { STORE_LOCATION } from "@/lib/store-location";
import { MaxRadiusSlider } from "@/components/features/max-radius-slider";
import { RingsTable } from "@/components/features/rings-table";
import { CepTester } from "@/components/features/cep-tester";
import { ZonesStatsStrip } from "@/components/admin/zones/zones-stats-strip";

// ─── Mapa lazy (ssr: false está no page.tsx, mas re-exportado aqui tb) ─────────

const StoreMap = dynamic(
  () => import("@/components/features/store-map").then((m) => ({ default: m.StoreMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-lg bg-paper-100 md:h-[500px]" />
    ),
  },
);

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { visible, show };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ZonesClient() {
  const rings = useRingsStore((s) => s.rings);

  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const toast = useToast();

  // Toast observa mudanças no store de anéis
  const ringsRef = useRef(rings);
  useEffect(() => {
    if (ringsRef.current !== rings) {
      toast.show();
      ringsRef.current = rings;
    }
  }, [rings, toast]);

  return (
    <div className="relative flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col gap-0.5">
        <h1 className="text-h2 font-bold text-olive-900">Área de Entrega</h1>
        <p className="text-body-sm text-olive-700">
          Centro:{" "}
          <span className="font-medium">
            {STORE_LOCATION.street} {STORE_LOCATION.number} · {STORE_LOCATION.neighborhood} ·{" "}
            {STORE_LOCATION.cep}
          </span>
        </p>
      </header>

      {/* Strip de KPIs */}
      <ZonesStatsStrip rings={rings} />

      {/* Layout: mapa + painel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Mapa */}
        <div className="min-w-0">
          <StoreMap
            rings={rings}
            highlightedId={highlightedId}
            onRingClick={(id) => setHighlightedId((prev) => (prev === id ? undefined : id))}
          />
        </div>

        {/* Painel de controle */}
        <aside className="flex min-w-0 flex-col gap-6">
          <CepTester />
          <hr className="border-divider" />
          <MaxRadiusSlider />
          <hr className="border-divider" />
          <RingsTable highlightedId={highlightedId} />
        </aside>
      </div>

      {/* Toast "Zonas atualizadas" */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-olive-900 px-4 py-2 text-body-sm font-semibold text-paper-50 shadow-md transition-all duration-300 ${toast.visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"} `}
      >
        Zonas atualizadas
      </div>
    </div>
  );
}
