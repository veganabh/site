// Rota para adicionar novo produto ao cardápio.
// Pública pré-migração (sem auth). Ver CLAUDE.md §7.

import type { Metadata } from "next";
import { ProdutoForm } from "@/components/features/cardapio/produto-form";

export const metadata: Metadata = {
  title: "Novo produto — Cardápio Vegana BH",
};

export default function NovoProdutoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Novo produto</h1>
        <p className="text-body-sm text-olive-700">
          Preencha os campos e salve para adicionar ao cardápio.
        </p>
      </div>
      <ProdutoForm mode="novo" />
    </div>
  );
}
