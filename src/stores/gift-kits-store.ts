"use client";

import { create } from "zustand";
import type { GiftKitTemplate } from "@/types/gift-kit";

/**
 * Cache em memória dos templates de gift kit (com slots já hidratados).
 * Fonte da verdade vive em `public.gift_kit_templates` + `gift_kit_slots`
 * — este store é hidratado pelo `GiftKitsStoreHydrator` no root layout
 * a partir de `listGiftKitTemplates()` server.
 *
 * Fonte ÚNICA: admin (`/gestao/kits`) e público (`/presentear`) lêem o
 * mesmo array. Mutações via server actions em `actions/gift-kits.ts`
 * + `revalidatePath("/", "layout")` re-empurram a lista atualizada.
 */

type GiftKitsState = {
  kits: GiftKitTemplate[];
  setKits: (kits: GiftKitTemplate[]) => void;
  applyOptimisticUpdate: (id: string, patch: Partial<GiftKitTemplate>) => void;
};

export const useGiftKitsStore = create<GiftKitsState>()((set) => ({
  kits: [],

  setKits(kits) {
    set({ kits });
  },

  applyOptimisticUpdate(id, patch) {
    set((state) => ({
      kits: state.kits.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    }));
  },
}));

// ── Selectors / helpers ──────────────────────────────────────────────────────

/**
 * Map id → template para lookups O(1) em selectors derivados (cart subtotal,
 * checkout-steps render). Use via `useGiftKitsStore((s) => giftKitsById(s.kits))`
 * — recompute simples, volume baixo.
 */
export function giftKitsById(kits: GiftKitTemplate[]): Map<string, GiftKitTemplate> {
  return new Map(kits.map((k) => [k.id, k]));
}
