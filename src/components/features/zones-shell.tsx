"use client";

/**
 * Shell client do módulo de zonas.
 * Contém o dynamic import com ssr:false — obrigatório em Client Component no Next.js 16.
 * Ver ADR 0006 D3 + nota de compat Next 16/Turbopack.
 */
import dynamic from "next/dynamic";

const ZonesClient = dynamic(
  () =>
    import("@/components/features/zones-client").then((m) => ({
      default: m.ZonesClient,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[500px] animate-pulse rounded-lg bg-paper-100" />,
  },
);

export function ZonesShell() {
  return <ZonesClient />;
}
