"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LayoutGrid, ChevronRight, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCollectionIcon } from "@/lib/collection-icons";
import { iconForCategory } from "@/lib/category-icons";
import { useCollectionsStore } from "@/stores/collections-store";
import { useActiveCategories } from "@/stores/categories-store";
import { useMenuStore } from "@/stores/menu-store";

type CategoryCirclesProps = {
  /** Slug ativo — "all" | ProductCategory | collection slug */
  active?: string;
  basePath: string;
  className?: string;
};

type Item = {
  slug: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** false = sem item em estoque → cinza, não-clicável, tag "sem estoque". */
  available: boolean;
};

/**
 * Chip bar com dois blocos separados por divider:
 *   1. Categorias reais do cardápio (Todos + tabela `categories`, dinâmica)
 *   2. Super-coleções customizadas (Para Presentear, etc.) — `useCollectionsStore`
 *
 * Regras de categoria (derivadas do menu store, sem mexer no banco):
 *   - Só aparece categoria que TEM produto no cardápio (total > 0).
 *   - Categoria sem nenhum item ativo em estoque → cinza, não-clicável,
 *     tag "sem estoque". Reativa sozinha quando algum item ganhar estoque.
 *   - Disponíveis vêm primeiro; as "sem estoque" vão pro fim.
 */
export function CategoryCircles({ active = "all", basePath, className }: CategoryCirclesProps) {
  const collections = useCollectionsStore((s) => s.collections);
  const categories = useActiveCategories();
  const products = useMenuStore((s) => s.products);

  // total e em-estoque por slug de categoria.
  const statsBySlug = useMemo(() => {
    const m = new Map<string, { total: number; inStock: number }>();
    for (const p of products) {
      const cur = m.get(p.category) ?? { total: 0, inStock: 0 };
      cur.total += 1;
      if (p.active && p.stock > 0) cur.inStock += 1;
      m.set(p.category, cur);
    }
    return m;
  }, [products]);

  const categoryItems: Item[] = useMemo(() => {
    // Só escondemos categoria vazia quando TEMOS dados de produto. Se o menu
    // store ainda não hidratou (ex: visitante anônimo sem produtos carregados),
    // mostramos as categorias reais normalmente em vez de sumir com tudo.
    const hasProductData = products.length > 0;

    const real = categories
      .map((c) => {
        const s = statsBySlug.get(c.slug);
        return {
          c,
          total: s?.total ?? 0,
          // sem dados → trata como disponível (não cinza).
          available: s ? s.inStock > 0 : true,
        };
      })
      .filter((x) => !hasProductData || x.total > 0)
      // disponíveis primeiro; preserva sort_order dentro de cada grupo (sort estável).
      .sort((a, b) => Number(b.available) - Number(a.available));

    return [
      { slug: "all", label: "Todos", icon: LayoutGrid, href: basePath, available: true },
      ...real.map(({ c, available }) => ({
        slug: c.slug,
        label: c.name,
        icon: iconForCategory(`${c.slug} ${c.name}`),
        href: `${basePath}?cat=${c.slug}`,
        available,
      })),
    ];
  }, [categories, statsBySlug, products.length, basePath]);

  const collectionItems: Item[] = collections.map((c) => ({
    slug: c.slug,
    label: c.name,
    icon: resolveCollectionIcon(c.iconName),
    href: c.routePath ?? `${basePath}?col=${c.slug}`,
    available: true,
  }));

  // Encomendas: destino fixo (igual "Para Presentear"), sempre visível.
  // Catálogo próprio em /encomendas, independente de estoque do cardápio.
  const specialItems: Item[] = [
    ...collectionItems,
    {
      slug: "encomendas",
      label: "Encomendas",
      icon: CalendarClock,
      href: "/encomendas",
      available: true,
    },
  ];

  return (
    <div className={cn("relative", className)}>
      <nav
        aria-label="Categorias do cardápio"
        className="flex items-start gap-2 overflow-x-auto scroll-smooth pr-6 [scrollbar-width:none] md:gap-3 md:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {categoryItems.map((item) => (
          <CategoryChip key={item.slug} item={item} active={active === item.slug} tier="primary" />
        ))}

        {specialItems.length > 0 && <TierDivider />}

        {specialItems.map((item) => (
          <CategoryChip
            key={item.slug}
            item={item}
            active={active === item.slug}
            tier="collection"
          />
        ))}
      </nav>

      {/* Fade edge: indica scroll horizontal escondido (só mobile) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-paper-50 via-paper-50/90 to-transparent pr-1 text-olive-700 md:hidden"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}

function TierDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-10 w-px shrink-0 self-center bg-divider md:mx-2 md:h-12"
    />
  );
}

type Tier = "primary" | "collection";

type CategoryChipProps = {
  item: Item;
  active: boolean;
  tier: Tier;
};

/**
 * Largura fixa + label em até 2 linhas (line-clamp) pra nomes longos não
 * estourarem a régua. Indisponível (sem estoque) = cinza, não-clicável, tag.
 */
function CategoryChip({ item, active, tier }: CategoryChipProps) {
  const Icon = item.icon;
  const isPrimary = tier === "primary";

  const iconBox = (
    <span
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-sm border-2 transition-all md:h-16 md:w-16",
        !item.available
          ? "border-divider bg-paper-100 text-olive-700"
          : active
            ? "border-terra-500 bg-olive-900 text-paper-50 shadow-md"
            : isPrimary
              ? "border-divider bg-paper-50 text-olive-900 hover:border-terra-500"
              : "border-leaf-500/30 bg-leaf-500/8 text-leaf-700 hover:border-leaf-500/70",
      )}
    >
      <Icon
        className="h-5 w-5 md:h-6 md:w-6"
        aria-hidden="true"
        strokeWidth={active ? 2.25 : 1.9}
      />
    </span>
  );

  const label = (
    <span
      className={cn(
        "line-clamp-2 w-[4.75rem] text-center text-micro leading-tight font-semibold",
        !item.available
          ? "text-olive-700"
          : active
            ? "text-terra-700"
            : isPrimary
              ? "text-olive-900"
              : "text-leaf-700",
      )}
    >
      {item.label}
    </span>
  );

  // Sem estoque: não-clicável (div), cinza, tag sutil.
  if (!item.available) {
    return (
      <div
        aria-disabled="true"
        title="Sem estoque no momento"
        className="flex shrink-0 cursor-not-allowed flex-col items-center gap-1.5 opacity-90"
      >
        {iconBox}
        {label}
        <span className="text-micro font-medium tracking-wide text-olive-700 uppercase">
          sem estoque
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      {iconBox}
      {label}
    </Link>
  );
}
