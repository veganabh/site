"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { SearchBar } from "@/components/dashboard/search-bar";
import { cn } from "@/lib/utils";

const OPEN_HOUR = 10;
const CLOSE_HOUR = 20;

type TopBarProps = {
  className?: string;
};

export function TopBar({ className }: TopBarProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour = now?.getHours() ?? -1;
  const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;

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
        <SearchBar />
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
            {isOpen
              ? `Forno ligado · até ${CLOSE_HOUR}h`
              : `Forno em pausa · volta ${OPEN_HOUR}h`}
          </div>
        )}

        <button
          type="button"
          aria-label="Notificações"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-paper-50 text-olive-900 transition-colors hover:bg-paper-100"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-terra-500" />
        </button>

        <div className="ml-0.5 flex items-center gap-2.5 rounded-pill border border-divider bg-paper-50 py-1 pr-3 pl-1 transition-colors hover:bg-paper-100">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-300 font-serif text-[14px] font-semibold text-olive-900">
            A
          </span>
          <div className="hidden leading-tight md:block">
            <p className="text-[13px] font-semibold text-olive-900">Ana</p>
            <p className="text-[11px] text-olive-900/60">Belo Horizonte</p>
          </div>
        </div>
      </div>
    </header>
  );
}
