"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  placeholder?: string;
  className?: string;
};

/**
 * Input de busca com atalho Ctrl/⌘+K.
 * Estilo inspirado na referência Magical Munch — pílula clara, leve, tecla visível.
 */
export function SearchBar({
  placeholder = "Buscar bolo, brigadeiro, sabor...",
  className,
}: SearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-pill border border-transparent bg-paper-100 px-3 text-[12px] text-olive-700 transition-colors focus-within:border-terra-500/30 focus-within:bg-paper-50",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-olive-700" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        aria-label="Buscar no cardápio"
        className="flex-1 bg-transparent text-olive-900 outline-none placeholder:text-olive-700 [&:focus-visible]:outline-none"
      />
      <kbd
        aria-hidden="true"
        className="hidden items-center gap-1 rounded-sm border border-divider bg-paper-50 px-2 py-0.5 text-caption text-olive-700 md:inline-flex"
      >
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </div>
  );
}
