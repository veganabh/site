"use client";

import { useRef } from "react";

import type { Product } from "@/types/product";
import { useMenuStore } from "@/stores/menu-store";

/**
 * Hydrator do `useMenuStore`.
 *
 * Recebe `products` fetched server-side e sincroniza com o Zustand. Sync acontece
 * em todo render onde a referência da prop muda — após `revalidatePath("/", "layout")`
 * de uma server action o root layout re-busca produtos, retorna nova array, e
 * o hydrator empurra a lista atualizada pro store. Sem flash, sem perder edits.
 */
export function MenuStoreHydrator({ products }: { products: Product[] }) {
  const lastRef = useRef<Product[] | null>(null);

  if (lastRef.current !== products) {
    useMenuStore.setState({ products });
    lastRef.current = products;
  }

  return null;
}
