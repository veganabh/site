import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos — Gestão Veg.ana",
  description: "Kanban de pedidos do site — aceitar, preparar, chamar entregador.",
};

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
