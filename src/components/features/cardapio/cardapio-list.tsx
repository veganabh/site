"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Search,
  X,
  SlidersHorizontal,
  ListChecks,
} from "lucide-react";
import { useMenuStore } from "@/stores/menu-store";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { Product } from "@/types/product";
import { useActiveCategories } from "@/stores/categories-store";
import { CardapioStatsStrip } from "@/components/admin/cardapio/cardapio-stats-strip";
import { BulkEditBar } from "@/components/admin/cardapio/bulk-edit-bar";
import { setStockAction, toggleActiveProductAction } from "@/server/actions/products";

type StockFilter = "todos" | "esgotado" | "baixo" | "ok";
type StatusFilter = "todos" | "ativos" | "inativos";

/**
 * Lista de produtos do cardápio agrupada por categoria com filtros inteligentes:
 * busca textual, categoria, estado de estoque e status (ativo/inativo).
 * Componente client — lê e escreve no useMenuStore.
 *
 * P0 UX:
 * - KPI strip acima da busca (Produtos ativos / Valor em estoque / Esgotados / Baixos / Total).
 * - Filtros colapsam em painel toggleável (padrão: fechado). Busca sempre visível.
 * - Densidade: thumb 48px, linhas py-2, badges compactos (text-micro px-1.5 py-0).
 */
export function CardapioList() {
  const { products, toggleActive, adjustStock } = useMenuStore();
  const categories = useActiveCategories();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * Otimistic UI: aplica mudança Zustand local pra resposta instantânea,
   * dispara server action em paralelo. Erro = reverte local + mostra alerta;
   * sucesso = router.refresh re-hidrata via root layout.
   */
  const persistToggleActive = (id: string, nextActive: boolean) => {
    toggleActive(id);
    startTransition(async () => {
      const result = await toggleActiveProductAction(id, nextActive);
      if (!result.ok) {
        toggleActive(id);
        setActionError(result.message);
      }
    });
  };

  const persistAdjustStock = (id: string, delta: number, currentStock: number) => {
    const next = Math.max(0, currentStock + delta);
    adjustStock(id, delta);
    startTransition(async () => {
      const result = await setStockAction({ id, value: next });
      if (!result.ok) {
        adjustStock(id, -delta);
        setActionError(result.message);
      } else {
        router.refresh();
      }
    });
  };

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Modo de seleção em massa ───────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setManySelected = (ids: string[], checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
  };

  // ── Métricas globais (para contagens em chips) ─────────────────────────
  const ativos = products.filter((p) => p.active).length;
  const esgotados = products.filter((p) => p.stock === 0).length;
  const baixos = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;

  // ── Aplicação dos filtros ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "todas" && p.category !== categoryFilter) return false;

      if (stockFilter === "esgotado" && p.stock !== 0) return false;
      if (stockFilter === "baixo" && !(p.stock > 0 && p.stock <= p.lowStockThreshold)) return false;
      if (stockFilter === "ok" && p.stock <= p.lowStockThreshold) return false;

      if (statusFilter === "ativos" && !p.active) return false;
      if (statusFilter === "inativos" && p.active) return false;

      return true;
    });
  }, [products, query, categoryFilter, stockFilter, statusFilter]);

  // Disponibilidade por categoria: tem ≥1 item ativo em estoque? Calculada do
  // conjunto COMPLETO de produtos (não do filtrado) — é propriedade da categoria.
  const availableBySlug = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of categories) m.set(c.slug, false);
    for (const p of products) {
      if (p.active && p.stock > 0) m.set(p.category, true);
    }
    return m;
  }, [products, categories]);

  // ── Agrupamento por categoria (dinâmico) ───────────────────────────────
  // Ordem = categorias ativas do store, mas categorias SEM item em estoque vão
  // pro fim (cinza). Produtos cujo slug não bate em nenhuma categoria (órfãos —
  // categoria deletada) caem no bucket "Sem categoria".
  const grouped = useMemo(() => {
    const order = categories
      .map((c) => c.slug)
      // sort estável: disponíveis primeiro (preserva sort_order dentro do grupo).
      .sort((a, b) => Number(availableBySlug.get(b)) - Number(availableBySlug.get(a)));
    const labelBySlug = new Map(categories.map((c) => [c.slug, c.name]));
    const map = new Map<string, Product[]>();
    for (const slug of order) map.set(slug, []);
    const orphan: Product[] = [];
    for (const p of filtered) {
      if (map.has(p.category)) map.get(p.category)!.push(p);
      else orphan.push(p);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    orphan.sort((a, b) => a.name.localeCompare(b.name));
    return { map, order, labelBySlug, orphan };
  }, [filtered, categories, availableBySlug]);

  const activeFiltersCount =
    (categoryFilter !== "todas" ? 1 : 0) +
    (stockFilter !== "todos" ? 1 : 0) +
    (statusFilter !== "todos" ? 1 : 0);

  const resetFilters = () => {
    setQuery("");
    setCategoryFilter("todas");
    setStockFilter("todos");
    setStatusFilter("todos");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Strip de KPIs */}
      <CardapioStatsStrip products={products} />

      {/* Busca + toggle de filtros */}
      <Card padding="sm" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-olive-700"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pelo nome do produto..."
              aria-label="Buscar produto pelo nome"
              className="w-full rounded-sm border border-divider bg-paper-50 py-1.5 pr-9 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700 focus:border-olive-700 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute relative top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-olive-700 before:absolute before:-inset-2.5 before:content-[''] hover:bg-paper-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="cardapio-filters-panel"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-body-sm font-semibold transition-colors",
              filtersOpen || activeFiltersCount > 0
                ? "border-olive-900 bg-olive-900 text-paper-50 hover:bg-olive-700"
                : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-paper-50 px-1 text-micro font-bold text-olive-900">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
            aria-pressed={selectionMode}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-body-sm font-semibold transition-colors",
              selectionMode
                ? "border-olive-900 bg-olive-900 text-paper-50 hover:bg-olive-700"
                : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
            )}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {selectionMode ? "Sair da seleção" : "Editar em massa"}
          </button>

          <span className="shrink-0 text-caption text-olive-700">
            <span className="font-semibold text-olive-900">{filtered.length}</span> de{" "}
            {products.length}
          </span>
        </div>

        {/* Painel de filtros — colapsável */}
        {filtersOpen && (
          <div
            id="cardapio-filters-panel"
            className="flex flex-col gap-2 border-t border-divider pt-2"
          >
            <FilterGroup label="Categoria">
              <FilterChip
                active={categoryFilter === "todas"}
                onClick={() => setCategoryFilter("todas")}
              >
                Todas
              </FilterChip>
              {categories.map((cat) => (
                <FilterChip
                  key={cat.slug}
                  active={categoryFilter === cat.slug}
                  onClick={() => setCategoryFilter(cat.slug)}
                >
                  {cat.name}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label="Estoque">
              <FilterChip active={stockFilter === "todos"} onClick={() => setStockFilter("todos")}>
                Todos
              </FilterChip>
              <FilterChip
                active={stockFilter === "ok"}
                onClick={() => setStockFilter("ok")}
                tone="leaf"
              >
                Em dia
              </FilterChip>
              <FilterChip
                active={stockFilter === "baixo"}
                onClick={() => setStockFilter("baixo")}
                tone="terra"
              >
                Baixo ({baixos})
              </FilterChip>
              <FilterChip
                active={stockFilter === "esgotado"}
                onClick={() => setStockFilter("esgotado")}
                tone="terra"
              >
                Esgotado ({esgotados})
              </FilterChip>
            </FilterGroup>

            <FilterGroup label="Status">
              <FilterChip
                active={statusFilter === "todos"}
                onClick={() => setStatusFilter("todos")}
              >
                Todos
              </FilterChip>
              <FilterChip
                active={statusFilter === "ativos"}
                onClick={() => setStatusFilter("ativos")}
                tone="leaf"
              >
                Ativos ({ativos})
              </FilterChip>
              <FilterChip
                active={statusFilter === "inativos"}
                onClick={() => setStatusFilter("inativos")}
              >
                Inativos ({products.length - ativos})
              </FilterChip>
            </FilterGroup>

            {activeFiltersCount > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1 text-caption font-semibold text-olive-700 hover:text-olive-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Seções por categoria */}
      {filtered.length === 0 ? (
        <Card
          padding="none"
          className="flex flex-col items-center gap-2 border-dashed p-10 text-center"
        >
          <p className="text-body-sm font-semibold text-olive-900">Nenhum produto encontrado</p>
          <p className="text-caption text-olive-700">
            Ajuste os filtros ou limpe a busca para ver o cardápio completo.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="hover:text-leaf-900 mt-1 text-caption font-semibold text-leaf-700"
          >
            Limpar filtros
          </button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {actionError && (
            <p
              role="alert"
              className="rounded-sm border border-terra-500 bg-terra-500/10 px-3 py-2 text-body-sm text-terra-700"
            >
              {actionError}
            </p>
          )}
          {grouped.order.map((slug) => {
            const list = grouped.map.get(slug) ?? [];
            if (list.length === 0) return null;
            return (
              <CategorySection
                key={slug}
                categoryLabel={grouped.labelBySlug.get(slug) ?? slug}
                dimmed={!availableBySlug.get(slug)}
                products={list}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={setManySelected}
                onToggleActive={(id) => {
                  const product = list.find((p) => p.id === id);
                  if (product) persistToggleActive(id, !product.active);
                }}
                onAdjustStock={(id, delta) => {
                  const product = list.find((p) => p.id === id);
                  if (product) persistAdjustStock(id, delta, product.stock);
                }}
              />
            );
          })}

          {/* Bucket de produtos órfãos (categoria deletada) */}
          {grouped.orphan.length > 0 && (
            <CategorySection
              key="__orphan__"
              categoryLabel="Sem categoria"
              dimmed={false}
              products={grouped.orphan}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={setManySelected}
              onToggleActive={(id) => {
                const product = grouped.orphan.find((p) => p.id === id);
                if (product) persistToggleActive(id, !product.active);
              }}
              onAdjustStock={(id, delta) => {
                const product = grouped.orphan.find((p) => p.id === id);
                if (product) persistAdjustStock(id, delta, product.stock);
              }}
            />
          )}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <BulkEditBar selectedIds={[...selectedIds]} onClearSelection={clearSelection} />
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-caption font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  tone = "neutral",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "neutral" | "leaf" | "terra";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-micro leading-tight font-semibold transition-colors",
        active
          ? tone === "leaf"
            ? "border-leaf-700 bg-leaf-500/15 text-leaf-700"
            : tone === "terra"
              ? "border-terra-500 bg-terra-500/15 text-terra-700"
              : "border-olive-900 bg-olive-900 text-paper-50"
          : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
      )}
    >
      {children}
    </button>
  );
}

function CategorySection({
  categoryLabel,
  dimmed,
  products,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onToggleActive,
  onAdjustStock,
}: {
  categoryLabel: string;
  /** Categoria sem nenhum item ativo em estoque → cinza + tag "sem estoque". */
  dimmed: boolean;
  products: Product[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[], checked: boolean) => void;
  onToggleActive: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
}) {
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const esgotados = products.filter((p) => p.stock === 0).length;
  const baixos = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;

  const categoryIds = products.map((p) => p.id);
  const allSelected = categoryIds.length > 0 && categoryIds.every((id) => selectedIds.has(id));

  return (
    <Card as="section" padding="none" className={cn("overflow-hidden", dimmed && "opacity-70")}>
      {/* Cabeçalho da categoria */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-paper-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <h2
            className={cn("text-body-sm font-bold", dimmed ? "text-olive-700" : "text-olive-900")}
          >
            {categoryLabel}
          </h2>
          <span className="rounded-full bg-paper-50 px-2 py-0 text-micro leading-4 font-semibold text-olive-700">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </span>
          {dimmed && (
            <span className="rounded-full bg-olive-900/8 px-1.5 py-0 text-micro leading-4 font-semibold tracking-wide text-olive-700 uppercase">
              sem estoque
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-micro text-olive-700">{totalStock} em estoque</span>
          {esgotados > 0 && (
            <span className="rounded-full bg-terra-500/15 px-1.5 py-0 text-micro leading-4 font-semibold text-terra-700">
              {esgotados} esgotado{esgotados > 1 ? "s" : ""}
            </span>
          )}
          {baixos > 0 && (
            <span className="bg-terra-300/25 rounded-full px-1.5 py-0 text-micro leading-4 font-semibold text-terra-700">
              {baixos} baixo{baixos > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      {/* Tabela da categoria */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
          <colgroup>
            {selectionMode && <col className="w-[44px]" />}
            <col className="w-[80px]" />
            <col />
            <col className="w-[104px]" />
            <col className="w-[15rem]" />
            <col className="w-[96px]" />
            <col className="w-[64px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-divider bg-paper-50">
              {selectionMode && (
                <th className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleSelectAll(categoryIds, e.target.checked)}
                    aria-label={`Selecionar todos de ${categoryLabel}`}
                    className="h-4 w-4 cursor-pointer accent-olive-900"
                  />
                </th>
              )}
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Foto
              </th>
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Produto
              </th>
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Preço site
              </th>
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Estoque
              </th>
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Status
              </th>
              <th className="px-3 py-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, i) => (
              <tr
                key={product.id}
                className={cn(
                  "border-b border-divider transition-colors last:border-0 hover:bg-paper-100/50",
                  !product.active && "opacity-50",
                  selectionMode && selectedIds.has(product.id) && "bg-olive-900/5",
                )}
              >
                {selectionMode && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                      aria-label={`Selecionar ${product.name}`}
                      className="h-4 w-4 cursor-pointer accent-olive-900"
                    />
                  </td>
                )}
                <td className="px-3 py-2">
                  <div className="relative h-12 w-12 overflow-hidden rounded-sm bg-paper-100">
                    {product.photo.url ? (
                      <Image
                        src={product.photo.url}
                        alt={product.photo.alt}
                        fill
                        className="object-cover"
                        sizes="48px"
                        priority={i < 4}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-paper-100">
                        <span className="text-micro font-bold text-olive-700">foto</span>
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-3 py-2">
                  <span
                    className="block truncate text-caption font-semibold text-olive-900"
                    title={product.name}
                  >
                    {product.name}
                  </span>
                </td>

                <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                  {formatBRL(product.price_site)}
                </td>

                {/* Coluna de estoque */}
                <td className="w-[15rem] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex w-[7rem] shrink-0 items-center">
                      {product.stock === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-terra-500/15 px-1.5 py-0 text-micro leading-4 font-semibold text-terra-700">
                          Esgotado
                        </span>
                      ) : product.stock <= product.lowStockThreshold ? (
                        <span className="bg-terra-300/25 inline-flex items-center rounded-full px-1.5 py-0 text-micro leading-4 font-semibold text-terra-700">
                          Baixo — {product.stock}
                        </span>
                      ) : (
                        <span className="text-micro text-olive-700">
                          {product.stock} em estoque
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustStock(product.id, -1)}
                        disabled={product.stock === 0}
                        aria-label={`Remover 1 de ${product.name}`}
                        className="relative flex h-6 w-6 items-center justify-center rounded-full border border-divider text-olive-700 transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustStock(product.id, 1)}
                        aria-label={`Adicionar 1 a ${product.name}`}
                        className="relative flex h-6 w-6 items-center justify-center rounded-full border border-divider text-olive-700 transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:bg-paper-100 hover:text-olive-900"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onToggleActive(product.id)}
                    aria-label={
                      product.active ? `Desativar ${product.name}` : `Ativar ${product.name}`
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-micro leading-4 font-semibold transition-colors",
                      product.active
                        ? "bg-leaf-500/10 text-leaf-700 hover:bg-leaf-500/20"
                        : "bg-paper-100 text-olive-700 hover:bg-paper-100",
                    )}
                  >
                    {product.active ? (
                      <Eye className="h-2.5 w-2.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-2.5 w-2.5" aria-hidden="true" />
                    )}
                    {product.active ? "Ativo" : "Inativo"}
                  </button>
                </td>

                <td className="px-3 py-2">
                  <Link
                    href={`/gestao/cardapio/${product.id}`}
                    aria-label={`Editar ${product.name}`}
                    className="relative flex h-7 w-7 items-center justify-center rounded-full text-olive-700 transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-paper-100 hover:text-olive-900"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
