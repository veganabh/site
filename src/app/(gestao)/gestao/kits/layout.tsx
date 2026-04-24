import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kits de presente — Gestão Veg.ana",
  description: "Gerenciar templates de kits — criar, editar, ativar/desativar.",
};

export default function KitsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
