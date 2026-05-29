"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      <div className="h-[400px] w-full animate-pulse rounded-sm bg-paper-100 md:h-[500px]" />
    ),
  },
);

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastState = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };

function useToast() {
  const [state, setState] = useState<ToastState>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => setState({ kind: "idle" }), []);

  const show = useCallback((next: Exclude<ToastState, { kind: "idle" }>) => {
    setState(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState({ kind: "idle" }), 2500);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { state, show, dismiss };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ZonesClient() {
  const rings = useRingsStore((s) => s.rings);

  const [highlightedId, setHighlightedId] = useState<string | undefined>();
  const toast = useToast();

  const handleSuccess = useCallback(() => {
    toast.show({ kind: "success" });
  }, [toast]);

  const handleError = useCallback(
    (message: string) => {
      toast.show({ kind: "error", message });
    },
    [toast],
  );

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
          <MaxRadiusSlider onMutationSuccess={handleSuccess} onMutationError={handleError} />
          <hr className="border-divider" />
          <RingsTable
            highlightedId={highlightedId}
            onMutationSuccess={handleSuccess}
            onMutationError={handleError}
          />
        </aside>
      </div>

      {/* Toast */}
      <div
        role={toast.state.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-body-sm font-semibold shadow-md transition-all duration-300 ${
          toast.state.kind === "error" ? "bg-terra-700 text-paper-50" : "bg-olive-900 text-paper-50"
        } ${toast.state.kind === "idle" ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
      >
        {toast.state.kind === "error" ? toast.state.message : "Zonas atualizadas"}
      </div>
    </div>
  );
}
