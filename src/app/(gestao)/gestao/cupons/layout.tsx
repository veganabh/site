import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cupons — Gestão Veg.ana",
  description: "Gerenciar cupons de desconto — criar, editar, ativar/desativar.",
};

export default function CuponsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
