import type { Metadata } from "next";
import { AdminGate } from "@/components/features/admin-gate";
import { ZonesShell } from "@/components/features/zones-shell";

export const metadata: Metadata = {
  title: "Zonas de Entrega — Gestão Veg.ana",
  description: "Configure raio de atendimento, taxa de entrega e tempo estimado por região.",
};

export default function ZonasPage() {
  return (
    <AdminGate>
      <ZonesShell />
    </AdminGate>
  );
}
