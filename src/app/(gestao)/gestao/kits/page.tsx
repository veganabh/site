"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveKitIcon } from "@/lib/kit-icons";
import { useGiftKitsStore } from "@/stores/gift-kits-store";
import type { GiftKitTemplate } from "@/types/gift-kit";
import { deleteGiftKitAction, toggleActiveGiftKitAction } from "@/server/actions/gift-kits";
import { KitFormDialog } from "@/components/admin/kits/kit-form-dialog";
import { KitDeleteDialog } from "@/components/admin/kits/kit-delete-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function countEligibleProducts(kit: GiftKitTemplate): number {
  const allIds = kit.slots.flatMap((s) => s.eligibleProductIds);
  return new Set(allIds).size;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function KitsPage() {
  const kits = useGiftKitsStore((s) => s.kits);
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<GiftKitTemplate | null>(null);
  const [deletingKit, setDeletingKit] = useState<GiftKitTemplate | null>(null);

  function handleOpenCreate() {
    setEditingKit(null);
    setFormOpen(true);
  }

  function handleOpenEdit(kit: GiftKitTemplate) {
    setEditingKit(kit);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditingKit(null);
  }

  function handleDeleteRequest(kit: GiftKitTemplate) {
    setDeletingKit(kit);
  }

  function handleDeleteConfirm() {
    if (deletingKit) {
      const id = deletingKit.id;
      startTransition(async () => {
        await deleteGiftKitAction(id);
      });
    }
    setDeletingKit(null);
  }

  function handleDeleteCancel() {
    setDeletingKit(null);
  }

  function handleToggle(kit: GiftKitTemplate) {
    startTransition(async () => {
      await toggleActiveGiftKitAction(kit.id, !kit.active);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Kits de presente</h1>
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo kit
        </Button>
      </div>

      {/* Conteúdo */}
      {kits.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-3 py-16 text-center text-olive-700">
          <Gift className="h-8 w-8 opacity-30" aria-hidden="true" />
          <p className="text-body-sm">Nenhum kit cadastrado — crie o primeiro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kits.map((kit) => {
            const KitIcon = resolveKitIcon(kit.iconName);
            const economy = kit.priceIfoodAnchor - kit.price;
            const totalEligible = countEligibleProducts(kit);

            return (
              <Card
                as="article"
                key={kit.id}
                padding="none"
                interactive
                className="flex flex-col overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-100">
                  <Image
                    src={kit.coverPhoto.url}
                    alt={kit.coverPhoto.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover"
                  />
                  {/* Ícone do kit no canto */}
                  <span
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-paper-50/90 shadow-sm backdrop-blur-sm"
                    aria-hidden="true"
                  >
                    <KitIcon className="h-3.5 w-3.5 text-olive-900" strokeWidth={1.75} />
                  </span>
                  {/* Badge ativo/inativo */}
                  <span
                    className={cn(
                      "absolute top-2 left-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] leading-4 font-semibold shadow-sm backdrop-blur-sm",
                      kit.active
                        ? "bg-leaf-700 text-paper-50"
                        : "bg-paper-50/90 text-olive-700 ring-1 ring-divider ring-inset",
                    )}
                  >
                    {kit.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                {/* Corpo */}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {/* Nome + tagline */}
                  <div>
                    <h3 className="text-body-sm font-semibold text-olive-900">{kit.name}</h3>
                    <p className="mt-0.5 text-caption text-olive-700 italic">{kit.tagline}</p>
                  </div>

                  {/* Preço */}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-body-sm font-bold text-olive-900">
                      R$&nbsp;{formatCurrency(kit.price)}
                    </span>
                    <span className="text-caption text-olive-700 line-through">
                      R$&nbsp;{formatCurrency(kit.priceIfoodAnchor)}
                    </span>
                    <span className="text-caption font-semibold text-leaf-700">
                      −R$&nbsp;{formatCurrency(economy)}
                    </span>
                  </div>

                  {/* Resumo de slots */}
                  <p className="text-caption text-olive-700">
                    {kit.slots.length} slot{kit.slots.length !== 1 ? "s" : ""} · {totalEligible}{" "}
                    produto{totalEligible !== 1 ? "s" : ""}{" "}
                    {totalEligible !== 1 ? "elegíveis" : "elegível"}
                  </p>

                  {/* Ações */}
                  <div className="mt-auto flex items-center gap-1 border-t border-divider pt-2">
                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(kit)}
                      aria-label={`Editar kit ${kit.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>

                    {/* Toggle ativo */}
                    <button
                      type="button"
                      onClick={() => handleToggle(kit)}
                      aria-label={
                        kit.active ? `Desativar kit ${kit.name}` : `Ativar kit ${kit.name}`
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
                    >
                      {kit.active ? (
                        <ToggleRight
                          className="h-4 w-4 text-leaf-700"
                          aria-hidden="true"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <ToggleLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                      )}
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(kit)}
                      aria-label={`Excluir kit ${kit.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition hover:bg-terra-500/10 hover:text-terra-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <KitFormDialog open={formOpen} kit={editingKit ?? undefined} onClose={handleCloseForm} />

      <KitDeleteDialog
        kit={deletingKit}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
