// Gerenciador de categorias do cardápio — área de gestão.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoriesManager } from "@/components/admin/cardapio/categories-manager";

export const metadata: Metadata = {
  title: "Categorias — Gestão Vegana BH",
  description: "Criar, editar, reordenar e excluir categorias do cardápio.",
};

export default function CategoriasPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href="/gestao/cardapio"
          className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar ao cardápio
        </Link>
        <h1 className="text-h2 font-bold text-olive-900">Categorias</h1>
        <p className="text-body-sm text-olive-700">
          Crie, renomeie, reordene ou exclua. A ordem aqui define a ordem das divisões no cardápio.
        </p>
      </div>

      <CategoriesManager />
    </div>
  );
}
