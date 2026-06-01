import type { Metadata } from "next";
import { listAllPreorders } from "@/server/preorders";
import { PreordersKanban } from "@/components/features/preorders/preorders-kanban";

export const metadata: Metadata = {
  title: "Encomendas — Gestão Vegana BH",
  description: "Gerenciamento de encomendas agendadas.",
};

export default async function GestaoEncomendasPage() {
  const preorders = await listAllPreorders();

  return <PreordersKanban initialPreorders={preorders} />;
}
