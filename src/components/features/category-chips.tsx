import Link from "next/link";
import type { ProductCategory } from "@/types/product";
import { CATEGORY_LABEL, VISIBLE_CATEGORIES } from "@/lib/product-meta";
import { cn } from "@/lib/utils";

type CategoryChipsProps = {
  /** Categoria ativa ou "all" para "Todos". */
  active?: ProductCategory | "all";
  /** Rota base onde as chips operam (ex: "/" ou "/loja"). */
  basePath: string;
  className?: string;
};

/**
 * Pílulas de filtro de categoria. SSR-friendly — cada chip é um Link
 * que muda a URL com `?cat=<slug>`. A página lê searchParams e filtra.
 */
export function CategoryChips({ active = "all", basePath, className }: CategoryChipsProps) {
  return (
    <nav
      aria-label="Filtrar por categoria"
      className={cn(
        "flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ChipLink href={basePath} label="Todos" active={active === "all"} />
      {VISIBLE_CATEGORIES.map((cat) => (
        <ChipLink
          key={cat}
          href={`${basePath}?cat=${cat}`}
          label={CATEGORY_LABEL[cat]}
          active={active === cat}
        />
      ))}
    </nav>
  );
}

type ChipLinkProps = {
  href: string;
  label: string;
  active: boolean;
};

function ChipLink({ href, label, active }: ChipLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
        active
          ? "bg-olive-900 text-paper-50"
          : "bg-paper-100 text-olive-900 hover:bg-paper-50 hover:ring-1 hover:ring-olive-900",
      )}
    >
      {label}
    </Link>
  );
}
