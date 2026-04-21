"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShoppingBag, CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House, matcher: (p: string) => p === "/" },
  {
    href: "/carrinho",
    label: "Carrinho",
    icon: ShoppingBag,
    matcher: (p: string) => p.startsWith("/carrinho"),
  },
  {
    href: "/conta",
    label: "Conta",
    icon: CircleUser,
    matcher: (p: string) => p.startsWith("/conta"),
  },
] as const;

/**
 * Navegação principal do mobile — 4 ícones fixos no bottom da viewport.
 * Desktop esconde (md:hidden) e usa o nav horizontal do Header.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-paper-50 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = item.matcher(pathname ?? "/");
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-caption transition-colors",
                  active ? "text-olive-900" : "text-olive-700 hover:text-olive-900",
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
