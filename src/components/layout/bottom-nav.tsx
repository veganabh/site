"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShoppingBag, CircleUser, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  matcher: (p: string) => boolean;
};

const BASE_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House, matcher: (p: string) => p === "/" },
  {
    href: "/carrinho",
    label: "Carrinho",
    icon: ShoppingBag,
    matcher: (p: string) => p.startsWith("/carrinho"),
  },
];

const AUTHED_LAST: NavItem = {
  href: "/conta",
  label: "Conta",
  icon: CircleUser,
  matcher: (p: string) => p.startsWith("/conta"),
};

const ANON_LAST: NavItem = {
  href: "/conta",
  label: "Entrar",
  icon: LogIn,
  matcher: (p: string) => p.startsWith("/conta"),
};

/**
 * Floating pill nav mobile — padrão iOS/Rappi 2024.
 * Terceiro item depende da sessão: "Conta" (autenticado) vs "Entrar" (anônimo).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { isAuthed } = useSession();

  const items: NavItem[] = [...BASE_ITEMS, isAuthed ? AUTHED_LAST : ANON_LAST];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 md:hidden"
    >
      <ul className="flex items-center justify-center gap-2 rounded-full bg-olive-900 p-2 shadow-lg">
        {items.map((item) => {
          const active = item.matcher(pathname ?? "/");
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-full transition-all duration-300 ease-out",
                  active
                    ? "bg-paper-50 px-4 text-olive-900"
                    : "w-10 text-paper-50/55 hover:text-paper-50",
                )}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  aria-hidden="true"
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {active && (
                  <span className="text-[13px] font-semibold whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
