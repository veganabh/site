"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Minus,
  Search,
  X,
} from "lucide-react";
import { useMenuStore } from "@/stores/menu-store";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/components/features/cardapio/category-labels";
import {
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
} from "@/types/product";

type StockFilter = "todos" | "esgotado" | "baixo" | "ok";
type StatusFilter = "todos" | "ativos" | "inativos";

/**
 * Lista de produtos do cardápio agrupada por categoria com filtros inteligentes:
 * busca textual, categoria, estado de estoque e status (ativo/inativo).
 * Componente client — lê e escreve no useMenuStore.
 */
export function CardapioList() {
  const { products, toggleActive, adjustStock } = useMenuStore();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"todas" | ProductCategory>(
    "todas",
  );
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // ── Métricas globais (base para resumo) ────────────────────────────────
  const ativos = products.filter((p) => p.active).length;
  const esgotados = products.filter((p) => p.stock === 0).length;
  const baixos = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;
  const tudoOk = esgotados === 0 && baixos === 0;

  // ── Aplicação dos filtros ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "todas" && p.category !== categoryFilter) return false;

      if (stockFilter === "esgotado" && p.stock !== 0) return false;
      if (
        stockFilter === "baixo" &&
        !(p.stock > 0 && p.stock <= p.lowStockThreshold)
      )
        return false;
      if (stockFilter === "ok" && p.stock <= p.lowStockThreshold) return false;

      if (statusFilter === "ativos" && !p.active) return false;
      if (statusFilter === "inativos" && p.active) return false;

      return true;
    });
  }, [products, query, categoryFilter, stockFilter, statusFilter]);

  // ── Agrupamento por categoria ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<ProductCategory, Product[]>();
    for (const cat of PRODUCT_CATEGORIES) map.set(cat, []);
    for (const p of filtered) map.get(p.category)?.push(p);
    // Ordena itens por nome dentro da categoria
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [filtered]);

  const activeFiltersCount =
    (query ? 1 : 0) +
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
      {/* Resumo de estoque */}
      <div className="flex flex-wrap items-center gap-2">
        {tudoOk ? (
          <p className="text-body-sm text-olive-700">
            Todos os produtos com estoque em dia.
          </p>
        ) : (
          <>
            {esgotados > 0 && (
              <span className="rounded-pill bg-terra-500/10 px-3 py-1 text-caption font-semibold text-terra-700">
                {esgotados} {esgotados === 1 ? "produto esgotado" : "produtos esgotados"}
              </span>
            )}
            {baixos > 0 && (
              <span className="rounded-pill bg-terra-300/20 px-3 py-1 text-caption font-semibold text-terra-700">
                {baixos} com estoque baixo
              </span>
            )}
          </>
        )}
        <span className="rounded-pill bg-paper-100 px-3 py-1 text-caption font-semibold text-olive-700">
          {ativos} {ativos === 1 ? "produto ativo" : "produtos ativos"}
        </span>
      </div>

      {/* Barra de filtros inteligentes */}
      <div className="flex flex-col gap-3 rounded-lg border border-divider bg-paper-50 p-4">
        {/* Busca textual */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-olive-700"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pelo nome do produto..."
            aria-label="Buscar produto pelo nome"
            className="w-full rounded-sm border border-divider bg-paper-50 py-2 pl-9 pr-9 text-body-sm text-olive-900 placeholder:text-olive-700/60 focus:border-olive-700 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-olive-700 hover:bg-paper-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Chips de categoria */}
        <FilterGroup label="Categoria">
          <FilterChip
            active={categoryFilter === "todas"}
            onClick={() => setCategoryFilter("todas")}
          >
            Todas
          </FilterChip>
          {PRODUCT_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </FilterChip>
          ))}
        </FilterGroup>

        {/* Chips de estoque */}
        <FilterGroup label="Estoque">
          <FilterChip
            active={stockFilter === "todos"}
            onClick={() => setStockFilter("todos")}
          >
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

        {/* Chips de status */}
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
          <div className="flex items-center justify-between border-t border-divider pt-3">
            <p className="text-caption text-olive-700">
              {filtered.length} de {products.length} produtos com os filtros aplicados
            </p>
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

      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm text-olive-700">
          <span className="font-semibold text-olive-900">{filtered.length}</span> de{" "}
          {products.length} produtos
        </p>
        <Link
          href="/gestao/cardapio/novo"
          className="flex items-center gap-2 rounded-sm bg-olive-900 px-4 py-2 text-cta text-paper-50 transition hover:bg-olive-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo produto
        </Link>
      </div>

      {/* Seções por categoria */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-divider bg-paper-50 p-10 text-center">
          <p className="text-body-sm font-semibold text-olive-900">
            Nenhum produto encontrado
          </p>
          <p className="text-caption text-olive-700">
            Ajuste os filtros ou limpe a busca para ver o cardápio completo.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-1 text-caption font-semibold text-leaf-700 hover:text-leaf-900"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {PRODUCT_CATEGORIES.map((cat) => {
            const list = grouped.get(cat) ?? [];
            if (list.length === 0) return null;
            return (
              <CategorySection
                key={cat}
                category={cat}
                products={list}
                onToggleActive={toggleActive}
                onAdjustStock={adjustStock}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-caption font-semibold uppercase tracking-wide text-olive-700">
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
        "rounded-pill border px-3 py-1 text-[12px] font-semibold leading-tight transition-colors",
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
  category,
  products,
  onToggleActive,
  onAdjustStock,
}: {
  category: ProductCategory;
  products: Product[];
  onToggleActive: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => void;
}) {
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const esgotados = products.filter((p) => p.stock === 0).length;
  const baixos = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;

  return (
    <section className="overflow-hidden rounded-lg border border-divider bg-paper-50">
      {/* Cabeçalho da categoria */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-paper-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-body font-bold text-olive-900">
            {CATEGORY_LABELS[category]}
          </h2>
          <span className="rounded-pill bg-paper-50 px-2.5 py-0.5 text-caption font-semibold text-olive-700">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-olive-700">
            {totalStock} em estoque
          </span>
          {esgotados > 0 && (
            <span className="rounded-pill bg-terra-500/15 px-2 py-0.5 text-caption font-semibold text-terra-700">
              {esgotados} esgotado{esgotados > 1 ? "s" : ""}
            </span>
          )}
          {baixos > 0 && (
            <span className="rounded-pill bg-terra-300/25 px-2 py-0.5 text-caption font-semibold text-terra-700">
              {baixos} baixo{baixos > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      {/* Tabela da categoria */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[72px]" />
            <col />
            <col className="w-[110px]" />
            <col className="w-[15rem]" />
            <col className="w-[104px]" />
            <col className="w-[72px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-divider bg-paper-50">
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
                Foto
              </th>
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
                Produto
              </th>
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
                Preço site
              </th>
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
                Estoque
              </th>
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
                Status
              </th>
              <th className="px-4 py-2 text-caption font-semibold uppercase tracking-wide text-olive-700">
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
                )}
              >
                <td className="px-4 py-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-md bg-paper-100">
                    {product.photo.url ? (
                      <Image
                        src={product.photo.url}
                        alt={product.photo.alt}
                        fill
                        className="object-cover"
                        sizes="40px"
                        priority={i < 4}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-paper-100">
                        <span className="text-[9px] font-bold text-olive-700">
                          foto
                        </span>
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span
                    className="block truncate text-body-sm font-semibold text-olive-900"
                    title={product.name}
                  >
                    {product.name}
                  </span>
                </td>

                <td className="px-4 py-3 text-body-sm font-semibold text-olive-900">
                  {formatBRL(product.price_site)}
                </td>

                {/* Coluna de estoque */}
                <td className="w-[15rem] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex w-[7.5rem] shrink-0 items-center">
                      {product.stock === 0 ? (
                        <span className="inline-flex items-center rounded-pill bg-terra-500/15 px-2.5 py-1 text-caption font-semibold text-terra-700">
                          Esgotado
                        </span>
                      ) : product.stock <= product.lowStockThreshold ? (
                        <span className="inline-flex items-center rounded-pill bg-terra-300/25 px-2.5 py-1 text-caption font-semibold text-terra-700">
                          Baixo — {product.stock}
                        </span>
                      ) : (
                        <span className="text-caption text-olive-700">
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
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-divider text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustStock(product.id, 1)}
                        aria-label={`Adicionar 1 a ${product.name}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-divider text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleActive(product.id)}
                    aria-label={
                      product.active
                        ? `Desativar ${product.name}`
                        : `Ativar ${product.name}`
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] font-semibold leading-tight transition-colors",
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

                <td className="px-4 py-3">
                  <Link
                    href={`/gestao/cardapio/${product.id}`}
                    aria-label={`Editar ${product.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
