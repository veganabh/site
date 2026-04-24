import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Configurações — Gestão Veg.ana",
  description: "Status da loja, horários de funcionamento e impressora.",
};

export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
