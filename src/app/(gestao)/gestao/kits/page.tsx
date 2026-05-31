"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Gift,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveKitIcon } from "@/lib/kit-icons";
import { useGiftKitsStore } from "@/stores/gift-kits-store";
import type { GiftKitTemplate } from "@/types/gift-kit";
import { deleteGiftKitAction, toggleActiveGiftKitAction } from "@/server/actions/gift-kits";
import { KitFormDialog } from "@/components/admin/kits/kit-form-dialog";
import { KitDeleteDialog } from "@/components/admin/kits/kit-delete-dialog";
import { KitsStatsStrip } from "@/components/admin/kits/kits-stats-strip";
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

/** Acima deste número de kits, exibe a busca por nome. */
const SEARCH_THRESHOLD = 6;

// ── Componente ─────────────────────────────────────────────────────────────────

export default function KitsPage() {
  const kits = useGiftKitsStore((s) => s.kits);
  const setKits = useGiftKitsStore((s) => s.setKits);
  const applyOptimisticUpdate = useGiftKitsStore((s) => s.applyOptimisticUpdate);
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<GiftKitTemplate | null>(null);
  const [deletingKit, setDeletingKit] = useState<GiftKitTemplate | null>(null);
  const [search, setSearch] = useState("");
  /** Kit em transição (toggle/excluir) — desabilita ações + mostra spinner. */
  const [actingId, setActingId] = useState<string | null>(null);

  // Ordena ativos primeiro, depois alfabético (pt-BR). Inativos descem.
  const sortedKits = useMemo(
    () =>
      [...kits].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR");
      }),
    [kits],
  );

  const showSearch = kits.length > SEARCH_THRESHOLD;

  const visibleKits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedKits;
    return sortedKits.filter(
      (k) => k.name.toLowerCase().includes(q) || k.tagline.toLowerCase().includes(q),
    );
  }, [sortedKits, search]);

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
    if (!deletingKit) return;
    const target = deletingKit;
    const snapshot = useGiftKitsStore.getState().kits;
    setDeletingKit(null);

    // Optimistic: remove da grade já. Reverte no erro.
    setKits(snapshot.filter((k) => k.id !== target.id));
    setActingId(target.id);

    startTransition(async () => {
      const result = await deleteGiftKitAction(target.id);
      setActingId(null);
      if (!result.ok) {
        setKits(snapshot);
        toast.error(result.message ?? "Não foi possível excluir o kit.");
        return;
      }
      toast.success(`Kit "${target.name}" excluído.`);
    });
  }

  function handleDeleteCancel() {
    setDeletingKit(null);
  }

  function handleToggle(kit: GiftKitTemplate) {
    const next = !kit.active;
    const snapshot = useGiftKitsStore.getState().kits;

    applyOptimisticUpdate(kit.id, { active: next });
    setActingId(kit.id);

    startTransition(async () => {
      const result = await toggleActiveGiftKitAction(kit.id, next);
      setActingId(null);
      if (!result.ok) {
        setKits(snapshot);
        toast.error(result.message ?? "Não foi possível alterar a visibilidade.");
        return;
      }
      toast.success(`Kit "${kit.name}" ${next ? "ativado" : "ocultado do público"}.`);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Kits de presente</h1>
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo kit
        </Button>
      </div>

      {/* Strip de métricas — só quando há kits */}
      {kits.length > 0 && <KitsStatsStrip kits={kits} />}

      {/* Busca — só quando o catálogo cresce */}
      {showSearch && (
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-olive-700"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar kit por nome"
            className={cn(
              "h-8 w-full rounded-sm border border-divider bg-paper-50 pr-8 pl-8",
              "text-caption text-olive-900 placeholder:text-olive-700",
              "focus:border-olive-900 focus:outline-none",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-olive-700 hover:bg-paper-100"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {kits.length === 0 ? (
        /* Empty state — rico, com CTA direto */
        <Card
          padding="none"
          className="flex flex-col items-center gap-3 border-dashed px-6 py-16 text-center"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-100 text-olive-700"
            aria-hidden="true"
          >
            <Gift className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-body font-semibold text-olive-900">Nenhum kit cadastrado ainda</p>
            <p className="mt-1 text-caption text-olive-700">
              Monte combos de presente com preço fixo e economia clara vs iFood.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="mt-1">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Criar primeiro kit
          </Button>
        </Card>
      ) : visibleKits.length === 0 ? (
        /* Busca sem resultado */
        <div className="flex flex-col items-center gap-2 py-10 text-center text-olive-700">
          <p className="text-caption">Nenhum kit com esse nome.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-caption font-semibold text-olive-900 underline-offset-2 hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleKits.map((kit) => {
            const KitIcon = resolveKitIcon(kit.iconName);
            const economy = kit.priceIfoodAnchor - kit.price;
            const totalEligible = countEligibleProducts(kit);
            const isActing = actingId === kit.id;

            return (
              <Card
                as="article"
                key={kit.id}
                padding="none"
                interactive
                className={cn(
                  "flex flex-col overflow-hidden transition-opacity",
                  !kit.active && "opacity-60",
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-paper-100">
                  <Image
                    src={kit.coverPhoto.url}
                    alt={kit.coverPhoto.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className={cn("object-cover transition-[filter]", !kit.active && "grayscale")}
                  />
                  {/* Ícone do kit no canto */}
                  <span
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-sm bg-paper-50/90 shadow-sm backdrop-blur-sm"
                    aria-hidden="true"
                  >
                    <KitIcon className="h-3.5 w-3.5 text-olive-900" strokeWidth={1.75} />
                  </span>
                  {/* Badge ativo/inativo */}
                  <span
                    className={cn(
                      "absolute top-2 left-2 inline-flex items-center rounded-full px-2 py-0.5 text-micro leading-4 font-semibold shadow-sm backdrop-blur-sm",
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
                      disabled={isActing}
                      aria-label={`Editar kit ${kit.name}`}
                      className="relative flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-1.5 before:content-[''] hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
                    </button>

                    {/* Toggle ativo */}
                    <button
                      type="button"
                      onClick={() => handleToggle(kit)}
                      disabled={isActing}
                      aria-label={
                        kit.active ? `Desativar kit ${kit.name}` : `Ativar kit ${kit.name}`
                      }
                      className="relative flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-1.5 before:content-[''] hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : kit.active ? (
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
                      disabled={isActing}
                      aria-label={`Excluir kit ${kit.name}`}
                      className="relative flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition before:absolute before:-inset-1.5 before:content-[''] hover:bg-terra-500/10 hover:text-terra-700 disabled:cursor-not-allowed disabled:opacity-40"
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
