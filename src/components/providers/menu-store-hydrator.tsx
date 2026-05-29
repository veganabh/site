"use client";

import type { Product } from "@/types/product";
import { useMenuStore } from "@/stores/menu-store";

/**
 * Hydrator do `useMenuStore`.
 *
 * Recebe `products` fetched server-side e sincroniza com o Zustand. Sync acontece
 * em todo render onde a referência da prop muda — após `revalidatePath("/", "layout")`
 * de uma server action o root layout re-busca produtos, retorna nova array, e
 * o hydrator empurra a lista atualizada pro store. Sem flash, sem perder edits.
 *
 * Compara contra `getState()` (não um ref de render) para manter o update
 * síncrono sem violar a regra react-hooks/refs.
 */
export function MenuStoreHydrator({ products }: { products: Product[] }) {
  if (useMenuStore.getState().products !== products) {
    useMenuStore.setState({ products });
  }

  return null;
}
