"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShoppingBag, ChartLine, Truck, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  matcher: (p: string) => boolean;
  /** Se true, exibe badge com contagem de itens do carrinho. */
  showCartBadge?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: House, matcher: (p: string) => p === "/" },
  {
    href: "/carrinho",
    label: "Pedido",
    icon: ShoppingBag,
    matcher: (p: string) => p.startsWith("/carrinho"),
    showCartBadge: true,
  },
  {
    href: "/conta",
    label: "Conta",
    icon: ChartLine,
    matcher: (p: string) => p.startsWith("/conta"),
  },
  {
    href: "/sobre",
    label: "Entrega",
    icon: Truck,
    matcher: (p: string) => p.startsWith("/sobre"),
  },
];

/**
 * Rail lateral do dashboard — ícones verticais com ativo em oliva-escuro.
 * O item "Pedido" exibe badge com quantidade de itens no carrinho quando > 0.
 * Só aparece em md+. No mobile, o BottomNav substitui.
 */
export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const cartCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0),
  );

  return (
    <aside
      aria-label="Navegação lateral"
      className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center justify-between border-r border-divider bg-paper-50 py-4 md:flex"
    >
      <Link
        href="/"
        aria-label="Veg.ana — início"
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-olive-900 text-paper-50 shadow-sm"
      >
        <LeafMark className="h-5 w-5" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2 pt-8">
        {NAV_ITEMS.map((item) => {
          const active = item.matcher(pathname);
          const Icon = item.icon;
          const badgeCount = item.showCartBadge ? cartCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={
                badgeCount > 0
                  ? `${item.label} — ${badgeCount} ${badgeCount === 1 ? "item" : "itens"} no carrinho`
                  : item.label
              }
              title={item.label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-olive-900 text-paper-50 shadow-sm"
                  : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
              )}
            >
              <Icon
                className="h-[18px] w-[18px]"
                aria-hidden="true"
                strokeWidth={active ? 2.25 : 1.75}
              />
              {badgeCount > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none",
                    active ? "bg-terra-500 text-paper-50" : "bg-terra-500 text-paper-50",
                  )}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Separador — área interna */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-6 border-t border-divider"
          role="separator"
          aria-label="Área interna"
        />
        <Link
          href="/gestao"
          aria-current={pathname.startsWith("/gestao") ? "page" : undefined}
          aria-label="Gestão — painel interno"
          title="Gestão"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            pathname.startsWith("/gestao")
              ? "bg-olive-900 text-paper-50 shadow-sm"
              : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
          )}
        >
          <LayoutDashboard
            className="h-[18px] w-[18px]"
            aria-hidden="true"
            strokeWidth={pathname.startsWith("/gestao") ? 2.25 : 1.75}
          />
        </Link>

        <button
          type="button"
          aria-label="Configurações"
          className="flex h-10 w-10 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
        >
          <Settings className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 20c0-8 6-14 16-16-1 9-6 15-14 16-.8.1-1.3-.6-1.1-1.3l2-5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
