import Link from "next/link";
import { LayoutGrid, Cookie, CakeSlice, Candy, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockCollections } from "@/lib/mock-collections";

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
};

/**
 * Categorias REAIS do cardápio — correspondem 1:1 a ProductCategory.
 * Não misturar com tags (favoritos/novidades) nem com super-coleções.
 */
const buildCategoryItems = (basePath: string): Item[] => [
  { slug: "all", label: "Todos", icon: LayoutGrid, href: basePath },
  {
    slug: "bolo-no-pote",
    label: "Bolo no Pote",
    icon: Cookie,
    href: `${basePath}?cat=bolo-no-pote`,
  },
  { slug: "bolo", label: "Bolos", icon: CakeSlice, href: `${basePath}?cat=bolo` },
  { slug: "docinho", label: "Docinhos", icon: Candy, href: `${basePath}?cat=docinho` },
];

/**
 * Chip bar com três blocos separados por divider:
 *   1. Categorias reais (Todos + ProductCategory)
 *   2. Super-coleções customizadas (Para Presentear, etc.) — mockCollections
 *   3. Festa à vista? (rota /encomendas, tratamento destacado)
 *
 * Super-coleções agregam produtos de múltiplas categorias-mãe sem duplicar estoque.
 */
export function CategoryCircles({ active = "all", basePath, className }: CategoryCirclesProps) {
  const categoryItems = buildCategoryItems(basePath);
  const collectionItems: Item[] = mockCollections.map((c) => ({
    slug: c.slug,
    label: c.name,
    icon: c.icon,
    // "presentear" virou rota própria (/presentear) com kits + curadoria.
    // Outras collections seguem como filtro ?col=<slug> na vitrine principal.
    href: c.slug === "presentear" ? "/presentear" : `${basePath}?col=${c.slug}`,
  }));

  return (
    <div className={cn("relative", className)}>
      <nav
        aria-label="Categorias do cardápio"
        className="flex items-end gap-2 overflow-x-auto scroll-smooth pr-6 [scrollbar-width:none] md:gap-3 md:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {categoryItems.map((item) => (
          <CategoryChip key={item.slug} item={item} active={active === item.slug} tier="primary" />
        ))}

        {collectionItems.length > 0 && <TierDivider />}

        {collectionItems.map((item) => (
          <CategoryChip
            key={item.slug}
            item={item}
            active={active === item.slug}
            tier="collection"
          />
        ))}

        {/* TODO: rota /encomendas ainda não existe.
            Reativar chip "Festa à vista?" (tier featured, terra-500) quando página for criada.
            Histórico do markup: ver git blame deste bloco. */}
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
 * Tamanho uniforme em todas as tiers. Hierarquia sinalizada só por cor:
 *  - primary: paper-50 + border-divider (peso neutro)
 *  - collection: soft leaf bg (recua)
 *  - featured (Festa): terra-500 fill + shadow (destaque), inline acima
 */
function CategoryChip({ item, active, tier }: CategoryChipProps) {
  const Icon = item.icon;
  const isPrimary = tier === "primary";

  return (
    <Link
      key={item.slug}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-lg border-2 transition-all md:h-16 md:w-16",
          active
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
      <span
        className={cn(
          "text-[12px] font-semibold whitespace-nowrap",
          active ? "text-terra-700" : isPrimary ? "text-olive-900" : "text-leaf-700",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
