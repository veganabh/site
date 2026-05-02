import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notificações — Gestão Veg.ana",
  description: "Gerenciar notificações broadcast — criar, editar, excluir.",
};

export default function NotificacoesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
