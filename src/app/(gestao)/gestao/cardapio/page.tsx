// Módulo de Cardápio — área interna de gestão.
// Rota pública pré-migração (sem auth). Ver CLAUDE.md §7.

import type { Metadata } from "next";
import { CardapioList } from "@/components/features/cardapio/cardapio-list";

export const metadata: Metadata = {
  title: "Cardápio — Gestão Vegana BH",
  description: "Gerir produtos do cardápio da Vegana BH.",
};

export default function CardapioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Cardápio</h1>
        <p className="text-body-sm text-olive-700">
          {/* sem serif aqui — UI administrativa, não momento poético */}
          Adicione, edite ou desative produtos a qualquer momento.
        </p>
      </div>
      <CardapioList />
    </div>
  );
}
