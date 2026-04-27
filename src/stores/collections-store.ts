"use client";

import { create } from "zustand";
import type { Collection } from "@/types/collection";

/**
 * Cache em memória das coleções (super-categorias curadas). Fonte da verdade
 * vive em `public.collections` no Supabase — este store é hidratado pelo
 * `CollectionsStoreHydrator` no root layout a partir de `listCollections()`.
 *
 * Mutações: server actions em `src/server/actions/collections.ts`. O hidrador
 * sincroniza após `revalidatePath("/", "layout")` — sem flash.
 */

type CollectionsState = {
  collections: Collection[];
  setCollections: (cols: Collection[]) => void;
  applyOptimisticUpdate: (id: string, patch: Partial<Collection>) => void;
};

export const useCollectionsStore = create<CollectionsState>()((set) => ({
  collections: [],

  setCollections(collections) {
    set({ collections });
  },

  applyOptimisticUpdate(id, patch) {
    set((state) => ({
      collections: state.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },
}));
