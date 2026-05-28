"use client";

import { useRef } from "react";

import type { Category } from "@/types/category";
import { useCategoriesStore } from "@/stores/categories-store";

/**
 * Hydrator do `useCategoriesStore`. Recebe categorias fetched server-side e
 * sincroniza com o Zustand. Após `revalidatePath("/", "layout")` de uma server
 * action o root layout re-busca e empurra a lista atualizada.
 */
export function CategoriesStoreHydrator({ categories }: { categories: Category[] }) {
  const lastRef = useRef<Category[] | null>(null);

  if (lastRef.current !== categories) {
    useCategoriesStore.setState({ categories });
    lastRef.current = categories;
  }

  return null;
}
