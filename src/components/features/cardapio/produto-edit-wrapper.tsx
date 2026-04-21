"use client";

import { useMenuStore } from "@/stores/menu-store";
import { ProdutoForm } from "@/components/features/cardapio/produto-form";
import Link from "next/link";

type Props = {
  id: string;
};

/**
 * Wrapper client que lê o produto do store pelo id e passa pro formulário.
 * Separado da página (Server Component) porque precisa de acesso ao store.
 */
export function ProdutoEditWrapper({ id }: Props) {
  const product = useMenuStore((s) => s.products.find((p) => p.id === id));

  if (!product) {
    return (
      <div className="rounded-lg border border-divider bg-paper-50 p-8 text-center">
        <p className="text-body text-olive-700">Produto não encontrado.</p>
        <Link
          href="/gestao/cardapio"
          className="mt-4 inline-block text-body-sm font-semibold text-olive-900 underline"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return <ProdutoForm mode="editar" product={product} />;
}
