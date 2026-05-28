"use client";

import { useMemo } from "react";
import { create } from "zustand";
import type { Category } from "@/types/category";

type CategoriesStore = {
  categories: Category[];
  setCategories: (categories: Category[]) => void;
};

export const useCategoriesStore = create<CategoriesStore>((set) => ({
  categories: [],
  setCategories: (categories) => set({ categories }),
}));

// ── Hooks derivados ───────────────────────────────────────────────────────────
//
// IMPORTANTE: NÃO usar selector que retorna `.filter().sort()` direto em
// `useCategoriesStore(...)` — gera array nova a cada render, e o Zustand
// (igualdade por referência) entra em loop infinito de re-render.
// Selecionamos a array crua (ref estável) e derivamos via useMemo.

/** Categorias ativas, ordenadas por sort_order. Ref estável (useMemo). */
export function useActiveCategories(): Category[] {
  const categories = useCategoriesStore((s) => s.categories);
  return useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
}

/** Mapa slug → name (todas). Ref estável (useMemo). */
export function useCategoryLabelMap(): Record<string, string> {
  const categories = useCategoriesStore((s) => s.categories);
  return useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.slug] = c.name;
    return map;
  }, [categories]);
}
