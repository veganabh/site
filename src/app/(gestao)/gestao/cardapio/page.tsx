// Módulo de Cardápio — área interna de gestão.
// Rota pública pré-migração (sem auth). Ver CLAUDE.md §7.

import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FolderCog } from "lucide-react";
import { CardapioList } from "@/components/features/cardapio/cardapio-list";
import { ImportCsvButton } from "@/components/admin/cardapio/import-csv-dialog";
import { Button } from "@/components/ui/button";

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
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/gestao/cardapio/categorias">
              <FolderCog className="h-4 w-4" aria-hidden="true" />
              Categorias
            </Link>
          </Button>
          <ImportCsvButton />
          <Button asChild variant="primary">
            <Link href="/gestao/cardapio/novo">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <CardapioList />
    </div>
  );
}
