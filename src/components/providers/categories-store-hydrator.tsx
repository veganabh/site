"use client";

import type { Category } from "@/types/category";
import { useCategoriesStore } from "@/stores/categories-store";

/**
 * Hydrator do `useCategoriesStore`. Recebe categorias fetched server-side e
 * sincroniza com o Zustand. Após `revalidatePath("/", "layout")` de uma server
 * action o root layout re-busca e empurra a lista atualizada.
 */
export function CategoriesStoreHydrator({ categories }: { categories: Category[] }) {
  if (useCategoriesStore.getState().categories !== categories) {
    useCategoriesStore.setState({ categories });
  }

  return null;
}
