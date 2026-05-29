"use client";

import type { Collection } from "@/types/collection";
import { useCollectionsStore } from "@/stores/collections-store";

/**
 * Hydrator do `useCollectionsStore`.
 *
 * Recebe `collections` fetched server-side e sincroniza com o Zustand. Sync
 * acontece em todo render onde a referência da prop muda — após
 * `revalidatePath("/", "layout")` de uma server action o root layout re-busca
 * coleções, retorna nova array, e o hydrator empurra a lista atualizada pro
 * store. Sem flash, sem perder edits.
 */
export function CollectionsStoreHydrator({ collections }: { collections: Collection[] }) {
  if (useCollectionsStore.getState().collections !== collections) {
    useCollectionsStore.setState({ collections });
  }

  return null;
}
