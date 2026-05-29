"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, UserCog } from "lucide-react";
import { ActiveOrderChip } from "@/components/dashboard/active-order-chip";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SearchBar } from "@/components/dashboard/search-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";
import { isStoreOpen } from "@/types/store-settings";
import { signOutAction } from "@/server/auth/actions";

type TopBarProps = {
  className?: string;
};

export function TopBar({ className }: TopBarProps) {
  const pathname = usePathname() ?? "/";
  const { isAuthed, user } = useSession();
  const storeStatus = useAdminSettingsStore((s) => s.storeStatus);
  const hours = useAdminSettingsStore((s) => s.hours);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  // Aberta = status ATIVO E dentro do horário do dia. PAUSADO fecha sempre.
  const isOpen = now ? isStoreOpen({ storeStatus, hours }, now) : false;

  const initial = user?.firstName.charAt(0).toUpperCase() ?? "A";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[72px] items-center gap-3 rounded-t-sm border-b border-divider bg-paper-50/80 px-3 backdrop-blur md:px-5",
        className,
      )}
    >
      <Link href="/" aria-label="Veg.ana — início" className="inline-flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Veg.ana" className="h-9 w-auto md:h-11" />
      </Link>

      <div className="ml-2 hidden max-w-lg flex-1 md:block">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ActiveOrderChip />

        {/* Status da loja — visual neutro pra não competir com o ActiveOrderChip. */}
        {now && (
          <div
            className="hidden items-center gap-2 rounded-full border border-divider bg-paper-50 px-3 py-1.5 text-caption font-medium text-olive-700 md:inline-flex"
            aria-live="polite"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOpen ? "animate-pulse bg-leaf-500" : "bg-terra-500",
              )}
              aria-hidden="true"
            />
            {isOpen ? "Loja aberta" : "Loja fechada"}
          </div>
        )}

        <NotificationBell />

        {isAuthed ? (
          <details className="group relative ml-0.5">
            <summary
              aria-label={`Menu da conta de ${user?.firstName ?? "usuário"}`}
              className={cn(
                "flex cursor-pointer list-none items-center gap-2.5 rounded-full border border-divider bg-paper-50 py-1 pr-3 pl-1 transition-colors",
                "hover:bg-paper-100",
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-300 text-body-sm font-bold text-olive-900">
                {initial}
              </span>
              <div className="hidden leading-tight md:block">
                <p className="text-body-sm font-semibold text-olive-900">{user?.firstName}</p>
                <p className="text-micro text-olive-900">{user?.city}</p>
              </div>
            </summary>

            <div className="absolute top-full right-0 z-30 mt-1 w-56 origin-top-right rounded-sm border border-divider bg-paper-50 shadow-md">
              <div className="border-b border-divider px-4 py-3">
                <p className="text-body-sm font-semibold text-olive-900">{user?.firstName}</p>
                <p className="truncate text-caption text-olive-700">{user?.email}</p>
              </div>
              <div className="p-1">
                <Link
                  href="/conta/perfil"
                  aria-current={pathname.startsWith("/conta/perfil") ? "page" : undefined}
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-olive-900 transition-colors hover:bg-paper-100"
                >
                  <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Meus dados
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-terra-700 transition-colors hover:bg-terra-500/10"
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </details>
        ) : (
          <Button asChild variant="primary" size="sm" className="ml-0.5 rounded-full px-3.5">
            <Link href="/login">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
