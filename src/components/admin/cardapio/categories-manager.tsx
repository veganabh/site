"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCategoriesStore } from "@/stores/categories-store";
import { useMenuStore } from "@/stores/menu-store";
import type { Category } from "@/types/category";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/server/actions/categories";

const inputClass =
  "h-9 w-full rounded-sm border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700 focus:border-olive-500 focus:outline-none";

/**
 * Gerenciador de categorias do cardápio. CRUD + reordenação. Lê a lista
 * (todas, ativas e inativas) do store; cada ação chama server action +
 * router.refresh() pra re-hidratar. Contagem de produtos por categoria vem
 * do menu-store (link por slug).
 */
export function CategoriesManager() {
  const router = useRouter();
  const allCategories = useCategoriesStore((s) => s.categories);
  const products = useMenuStore((s) => s.products);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...allCategories].sort((a, b) => a.sortOrder - b.sortOrder),
    [allCategories],
  );

  const countBySlug = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [products]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.message ?? "Algo deu errado.");
        return;
      }
      after?.();
      router.refresh();
    });
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    run(
      () => createCategoryAction({ name }),
      () => setNewName(""),
    );
  };

  const handleRename = (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    run(
      () => updateCategoryAction({ id, name }),
      () => {
        setEditingId(null);
        setEditingName("");
      },
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...sorted];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderCategoriesAction(next.map((c) => c.id)));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Criar nova */}
      <Card padding="sm" className="flex flex-col gap-2">
        <span className="text-caption font-semibold text-olive-700">Nova categoria</span>
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="ex: Tortas, Salgados, Sazonais..."
            className={inputClass}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={isPending || !newName.trim()}
            onClick={handleCreate}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </Button>
        </div>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-sm border border-terra-500 bg-terra-500/10 px-3 py-2 text-body-sm text-terra-700"
        >
          {error}
        </p>
      )}

      {/* Lista */}
      {sorted.length === 0 ? (
        <Card padding="none" className="border-dashed p-8 text-center">
          <p className="text-body-sm font-semibold text-olive-900">Nenhuma categoria.</p>
          <p className="text-caption text-olive-700">
            Crie a primeira acima para organizar o cardápio.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((cat, index) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              index={index}
              total={sorted.length}
              productCount={countBySlug.get(cat.slug) ?? 0}
              isPending={isPending}
              isEditing={editingId === cat.id}
              editingName={editingName}
              confirmingDelete={confirmDeleteId === cat.id}
              onStartEdit={() => {
                setEditingId(cat.id);
                setEditingName(cat.name);
              }}
              onChangeEditingName={setEditingName}
              onConfirmEdit={() => handleRename(cat.id)}
              onCancelEdit={() => {
                setEditingId(null);
                setEditingName("");
              }}
              onToggleActive={() =>
                run(() => updateCategoryAction({ id: cat.id, active: !cat.active }))
              }
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onRequestDelete={() => setConfirmDeleteId(cat.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() =>
                run(
                  () => deleteCategoryAction(cat.id),
                  () => setConfirmDeleteId(null),
                )
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  index,
  total,
  productCount,
  isPending,
  isEditing,
  editingName,
  confirmingDelete,
  onStartEdit,
  onChangeEditingName,
  onConfirmEdit,
  onCancelEdit,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  category: Category;
  index: number;
  total: number;
  productCount: number;
  isPending: boolean;
  isEditing: boolean;
  editingName: string;
  confirmingDelete: boolean;
  onStartEdit: () => void;
  onChangeEditingName: (v: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onToggleActive: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-sm border border-divider bg-paper-50 p-3",
        !category.active && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        {/* Reorder */}
        <div className="flex flex-col">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isPending || index === 0}
            aria-label="Mover para cima"
            className="flex h-4 w-5 items-center justify-center rounded-sm text-olive-700 hover:bg-paper-100 disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isPending || index === total - 1}
            aria-label="Mover para baixo"
            className="flex h-4 w-5 items-center justify-center rounded-sm text-olive-700 hover:bg-paper-100 disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {/* Nome (display ou edição) */}
        {isEditing ? (
          <input
            value={editingName}
            onChange={(e) => onChangeEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            autoFocus
            className={inputClass}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-body-sm font-semibold text-olive-900">
              {category.name}
            </span>
            <span className="shrink-0 rounded-full bg-paper-100 px-2 py-0 text-micro leading-4 font-semibold text-olive-700">
              {productCount} {productCount === 1 ? "produto" : "produtos"}
            </span>
            {!category.active && (
              <span className="shrink-0 rounded-full bg-paper-100 px-2 py-0 text-micro leading-4 font-semibold text-olive-700">
                oculta
              </span>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <IconBtn label="Salvar" onClick={onConfirmEdit} disabled={isPending}>
                <Check className="h-4 w-4" aria-hidden="true" />
              </IconBtn>
              <IconBtn label="Cancelar" onClick={onCancelEdit}>
                <X className="h-4 w-4" aria-hidden="true" />
              </IconBtn>
            </>
          ) : (
            <>
              <IconBtn
                label={category.active ? "Ocultar" : "Mostrar"}
                onClick={onToggleActive}
                disabled={isPending}
              >
                {category.active ? (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                )}
              </IconBtn>
              <IconBtn label="Renomear" onClick={onStartEdit}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </IconBtn>
              <IconBtn label="Excluir" tone="terra" onClick={onRequestDelete}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </IconBtn>
            </>
          )}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {confirmingDelete && (
        <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-2">
          <p className="flex-1 text-caption text-olive-900">
            Excluir <strong>{category.name}</strong>?
            {productCount > 0 && (
              <>
                {" "}
                {productCount} {productCount === 1 ? "produto fica" : "produtos ficam"} sem
                categoria (aparecem em &quot;Sem categoria&quot;).
              </>
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancelDelete}
            className="h-8 text-caption"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={onConfirmDelete}
            className="h-8 text-caption"
          >
            Excluir
          </Button>
        </div>
      )}
    </li>
  );
}

function IconBtn({
  label,
  tone = "neutral",
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  tone?: "neutral" | "terra";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40",
        tone === "terra"
          ? "text-terra-700 hover:bg-terra-500/10"
          : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
      )}
    >
      {children}
    </button>
  );
}
