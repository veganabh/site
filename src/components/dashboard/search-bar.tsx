"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  placeholder?: string;
  className?: string;
};

/**
 * Input de busca com atalho Ctrl/⌘+K.
 * Submete via querystring `?q=`. Home lê no Server Component e filtra.
 * Debounce de 250ms evita spam de navegação enquanto digita.
 */
export function SearchBar({
  placeholder = "Buscar bolo, brigadeiro, sabor...",
  className,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialQ);
  const lastPushed = useRef(initialQ);

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== lastPushed.current) {
      setValue(urlQ);
      lastPushed.current = urlQ;
    }
  }, [searchParams]);

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

  function pushQuery(next: string) {
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("q", next);
    else params.delete("q");
    // Busca sempre acontece na home — resultados vivem em `/`.
    const target = pathname === "/" ? "/" : "/";
    const qs = params.toString();
    router.replace(qs ? `${target}?${qs}` : target);
  }

  useEffect(() => {
    const id = setTimeout(() => pushQuery(value.trim()), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function clear() {
    setValue("");
    pushQuery("");
    ref.current?.focus();
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        pushQuery(value.trim());
      }}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-pill border border-transparent bg-paper-100 px-3 text-caption text-olive-700 transition-colors focus-within:border-terra-500/30 focus-within:bg-paper-50",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-olive-700" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        aria-label="Buscar no cardápio"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 bg-transparent text-olive-900 outline-none placeholder:text-olive-700 [&::-webkit-search-cancel-button]:hidden [&:focus-visible]:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar busca"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="hidden items-center gap-1 rounded-sm border border-divider bg-paper-50 px-2 py-0.5 text-caption text-olive-700 md:inline-flex"
        >
          <span className="text-micro">⌘</span>K
        </kbd>
      )}
    </form>
  );
}
