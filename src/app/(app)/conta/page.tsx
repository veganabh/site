import type { Metadata } from "next";
import { ContaDashboard } from "@/components/conta/conta-dashboard";

export const metadata: Metadata = {
  title: "Minha conta — Veg.ana",
  description:
    "Seu painel personalizado: economia acumulada, histórico de pedidos e atalhos rápidos.",
};

export default function Conta() {
  return <ContaDashboard />;
}
