// Rota de edição de produto — /gestao/cardapio/[id]
// Pública pré-migração (sem auth). Ver CLAUDE.md §7.

import type { Metadata } from "next";
import { ProdutoEditWrapper } from "@/components/features/cardapio/produto-edit-wrapper";

export const metadata: Metadata = {
  title: "Editar produto — Cardápio Vegana BH",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-olive-900">Editar produto</h1>
        <p className="text-body-sm text-olive-700">
          Altere os campos e salve para atualizar o cardápio.
        </p>
      </div>
      <ProdutoEditWrapper id={id} />
    </div>
  );
}
