"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ShoppingBag,
  CircleUser,
  Settings,
  LayoutDashboard,
  LogIn,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeafLoaderAnimation } from "@/components/features/leaf-loader-animation";
import { useCartStore } from "@/stores/cart-store";
import { useSession } from "@/lib/auth/use-session";
import { useSidebarStore } from "@/stores/sidebar-store";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  matcher: (p: string) => boolean;
  /** Se true, exibe badge com contagem de itens do carrinho. */
  showCartBadge?: boolean;
};

const BASE_NAV: NavItem[] = [
  { href: "/", label: "Início", icon: House, matcher: (p: string) => p === "/" },
  {
    href: "/carrinho",
    label: "Pedido",
    icon: ShoppingBag,
    matcher: (p: string) => p.startsWith("/carrinho"),
    showCartBadge: true,
  },
];

const CONTA_ITEM_AUTHED: NavItem = {
  href: "/conta",
  label: "Conta",
  icon: CircleUser,
  matcher: (p: string) => p.startsWith("/conta"),
};

const CONTA_ITEM_ANON: NavItem = {
  href: "/conta",
  label: "Entrar",
  icon: LogIn,
  matcher: (p: string) => p.startsWith("/conta"),
};

/**
 * Rail lateral do dashboard — colapsável.
 *
 * Collapsed (default): w-16, só ícones.
 * Expanded: w-56, ícones + labels.
 *
 * Estado persiste em `useSidebarStore.publicExpanded`.
 * Só aparece em md+. No mobile, o BottomNav substitui.
 */
export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const { isAuthed } = useSession();
  const expanded = useSidebarStore((s) => s.publicExpanded);
  const toggleExpanded = useSidebarStore((s) => s.togglePublic);

  const navItems: NavItem[] = [...BASE_NAV, isAuthed ? CONTA_ITEM_AUTHED : CONTA_ITEM_ANON];

  return (
    <aside
      aria-label="Navegação lateral"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-divider bg-paper-50 py-4 transition-[width] duration-200 ease-out md:flex",
        expanded ? "w-56" : "w-16",
      )}
    >
      {/* Topo: logo + toggle */}
      <div
        className={cn("flex items-center", expanded ? "justify-between px-3" : "justify-center")}
      >
        <Link
          href="/"
          aria-label="Veg.ana — início"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive-900 shadow-sm"
        >
          <LeafLoaderAnimation
            className="h-8 w-8"
            style={{ filter: "hue-rotate(-55deg) saturate(0.8) brightness(1.05)" }}
          />
        </Link>
        {expanded && (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav principal */}
      <nav
        className={cn(
          "flex flex-1 flex-col justify-center gap-2",
          expanded ? "items-stretch px-2" : "items-center",
        )}
      >
        {navItems.map((item) => {
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
              title={expanded ? undefined : item.label}
              className={cn(
                "relative flex items-center transition-colors",
                expanded
                  ? "h-10 gap-3 rounded-sm px-3"
                  : "h-10 w-10 justify-center self-center rounded-full",
                active
                  ? "bg-olive-900 text-paper-50 shadow-sm"
                  : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
              )}
            >
              <span className="relative flex shrink-0 items-center justify-center">
                <Icon
                  className="h-[18px] w-[18px]"
                  aria-hidden="true"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {badgeCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-terra-500 text-micro leading-none font-bold text-paper-50"
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              {expanded && (
                <span className="truncate text-body-sm font-semibold">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé: divider + gestão + dev + settings + toggle (quando collapsed) */}
      <div className={cn("flex flex-col gap-2", expanded ? "items-stretch px-2" : "items-center")}>
        <div
          className={cn("border-t border-divider", expanded ? "w-full" : "w-6 self-center")}
          role="separator"
          aria-label="Área interna"
        />

        <Link
          href="/gestao"
          aria-current={pathname.startsWith("/gestao") ? "page" : undefined}
          aria-label="Gestão — painel interno"
          title={expanded ? undefined : "Gestão"}
          className={cn(
            "relative flex items-center transition-colors",
            expanded
              ? "h-10 gap-3 rounded-sm px-3"
              : "h-10 w-10 justify-center self-center rounded-full",
            pathname.startsWith("/gestao")
              ? "bg-olive-900 text-paper-50 shadow-sm"
              : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
          )}
        >
          <LayoutDashboard
            className="h-[18px] w-[18px] shrink-0"
            aria-hidden="true"
            strokeWidth={pathname.startsWith("/gestao") ? 2.25 : 1.75}
          />
          {expanded && <span className="truncate text-body-sm font-semibold">Gestão</span>}
        </Link>

        <button
          type="button"
          aria-label="Configurações"
          title={expanded ? undefined : "Configurações"}
          className={cn(
            "flex items-center text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900",
            expanded
              ? "h-10 gap-3 rounded-sm px-3"
              : "h-10 w-10 justify-center self-center rounded-full",
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {expanded && <span className="truncate text-body-sm font-semibold">Configurações</span>}
        </button>

        {/* Toggle fica no rodapé quando collapsed */}
        {!expanded && (
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label="Expandir menu"
            title="Expandir menu"
            className="flex h-8 w-8 items-center justify-center self-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}
