"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogIn, UserCheck, UserX } from "lucide-react";
import { SearchBar } from "@/components/dashboard/search-bar";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { useDevSessionStore } from "@/stores/dev-session-store";

const OPEN_HOUR = 10;
const CLOSE_HOUR = 20;
const IS_DEV = process.env.NODE_ENV !== "production";

type TopBarProps = {
  className?: string;
};

export function TopBar({ className }: TopBarProps) {
  const pathname = usePathname() ?? "/";
  const { isAuthed, user } = useSession();
  const toggleAuth = useDevSessionStore((s) => s.toggle);
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

  const hour = now?.getHours() ?? -1;
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;

  const initial = user?.firstName.charAt(0).toUpperCase() ?? "A";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-[72px] items-center gap-3 rounded-t-lg border-b border-divider bg-paper-50/80 px-3 backdrop-blur md:px-5",
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
        {/* Status de funcionamento — descontraído, cor indica estado */}
        {now && (
          <div
            className={cn(
              "hidden items-center gap-2 rounded-pill px-3 py-1.5 text-[12px] font-semibold md:inline-flex",
              isOpen ? "bg-leaf-500/10 text-leaf-700" : "bg-terra-500/10 text-terra-700",
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOpen ? "animate-pulse bg-leaf-500" : "bg-terra-500",
              )}
              aria-hidden="true"
            />
            {isOpen ? `Forno ligado · até ${CLOSE_HOUR}h` : `Forno em pausa · volta ${OPEN_HOUR}h`}
          </div>
        )}

        {/* Dev toggle — mobile only (desktop tem na Sidebar) */}
        {IS_DEV && (
          <button
            type="button"
            onClick={toggleAuth}
            aria-label={
              isAuthed
                ? "Dev: sessão autenticada (clicar pra simular anônimo)"
                : "Dev: sessão anônima (clicar pra simular logado)"
            }
            title={isAuthed ? "Dev · logado" : "Dev · anônimo"}
            className={cn(
              "relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors md:hidden",
              isAuthed
                ? "border-leaf-500/40 bg-leaf-500/10 text-leaf-700"
                : "border-divider bg-paper-100 text-olive-700",
            )}
          >
            {isAuthed ? (
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UserX className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}

        <button
          type="button"
          aria-label="Notificações"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-paper-50 text-olive-900 transition-colors hover:bg-paper-100"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-terra-500" />
        </button>

        {isAuthed ? (
          <Link
            href="/conta/perfil"
            aria-current={pathname.startsWith("/conta/perfil") ? "page" : undefined}
            aria-label={`Abrir perfil de ${user?.firstName ?? "usuário"}`}
            className="ml-0.5 flex items-center gap-2.5 rounded-pill border border-divider bg-paper-50 py-1 pr-3 pl-1 transition-colors hover:bg-paper-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-300 text-[14px] font-bold text-olive-900">
              {initial}
            </span>
            <div className="hidden leading-tight md:block">
              <p className="text-[13px] font-semibold text-olive-900">{user?.firstName}</p>
              <p className="text-[11px] text-olive-900/60">{user?.city}</p>
            </div>
          </Link>
        ) : (
          <Link
            href="/conta"
            className="ml-0.5 inline-flex h-9 items-center gap-1.5 rounded-pill bg-olive-900 px-3.5 text-[13px] font-semibold text-paper-50 transition-colors hover:bg-olive-700"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
        )}
      </div>
    </header>
  );
}
