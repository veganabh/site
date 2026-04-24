// Módulo de Cardápio — área interna de gestão.
// Rota pública pré-migração (sem auth). Ver CLAUDE.md §7.

import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CardapioList } from "@/components/features/cardapio/cardapio-list";

export const metadata: Metadata = {
  title: "Cardápio — Gestão Vegana BH",
  description: "Gerir produtos do cardápio da Vegana BH.",
};

export default function CardapioPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header com título + CTA primária */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-h2 font-bold text-olive-900">Cardápio</h1>
          <p className="text-body-sm text-olive-700">
            {/* sem serif aqui — UI administrativa, não momento poético */}
            Adicione, edite ou desative produtos a qualquer momento.
          </p>
        </div>
        <Link
          href="/gestao/cardapio/novo"
          className="inline-flex items-center gap-2 rounded-sm bg-olive-900 px-4 py-2 text-cta text-paper-50 transition hover:bg-olive-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo produto
        </Link>
      </div>

      <CardapioList />
    </div>
  );
}
