import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Cardápio" },
  { href: "/conta", label: "Conta" },
] as const;

type HeaderProps = {
  className?: string;
};

/**
 * Header principal — logo + nav desktop + ícone de carrinho.
 * Nav principal some no mobile — resolvida pelo BottomNav.
 * Quando ADR 0004 entrar, o CartBadge client-component vira filho do botão.
 */
export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center border-b border-divider bg-paper-50 md:h-20",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4">
        <Link href="/" aria-label="Veg.ana — início" className="inline-flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Veg.ana" className="h-8 w-auto md:h-10" />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-body-sm font-medium text-olive-900 transition-colors hover:text-olive-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/carrinho"
          aria-label="Ver carrinho"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-olive-900 transition-colors hover:bg-paper-100"
        >
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
