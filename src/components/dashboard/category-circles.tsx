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
        className="flex items-end gap-2 overflow-x-auto pr-6 scroll-smooth [scrollbar-width:none] md:gap-3 md:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {categoryItems.map((item) => (
          <CategoryChip
            key={item.slug}
            item={item}
            active={active === item.slug}
            tier="primary"
          />
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

        <TierDivider />

        {/* Festa à vista — tier featured, rota /encomendas */}
        <Link
          href="/encomendas"
          aria-label="Encomendas para festas e eventos"
          className="group flex shrink-0 flex-col items-center gap-1.5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-terra-500 bg-terra-500 text-paper-50 shadow-md md:h-16 md:w-16">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5 md:h-6 md:w-6"
            >
              <g className="[transform-box:fill-box] [transform-origin:center] group-hover:[animation:party-shake_0.6s_ease-in-out_infinite]">
                <line x1="6" y1="1.2" x2="6" y2="3" />
                <line x1="12" y1="0.5" x2="12" y2="2.5" />
                <line x1="18" y1="1.2" x2="18" y2="3" />
              </g>
              <line x1="6" y1="3.5" x2="6" y2="7" />
              <line x1="12" y1="3" x2="12" y2="7" />
              <line x1="18" y1="3.5" x2="18" y2="7" />
              <path d="M6 7H18" />
              <path d="M6 7V11" />
              <path d="M18 7V11" />
              <path d="M6 11 Q8 12.4 10 11 T14 11 T18 11" />
              <path d="M3 12H6" />
              <path d="M18 12H21" />
              <path d="M3 12V17" />
              <path d="M21 12V17" />
              <path d="M3 17 Q6 18.4 9 17 T15 17 T21 17" />
              <path d="M2 18H22" />
              <path d="M4.5 21H19.5" />
              <path d="M2 18 L4.5 21" />
              <path d="M22 18 L19.5 21" />
            </svg>
          </span>
          <span className="text-[12px] font-semibold whitespace-nowrap text-terra-700">
            Festa à vista?
          </span>
        </Link>
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
          active
            ? "text-terra-700"
            : isPrimary
              ? "text-olive-900"
              : "text-leaf-700",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
