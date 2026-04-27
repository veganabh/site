"use client";

import { useRef } from "react";

import type { GiftKitTemplate } from "@/types/gift-kit";
import { useGiftKitsStore } from "@/stores/gift-kits-store";

/**
 * Hydrator do `useGiftKitsStore`. Sync acontece em todo render onde a
 * referência da prop muda — após `revalidatePath("/", "layout")` o root
 * layout re-busca kits e empurra a lista atualizada pro store.
 */
export function GiftKitsStoreHydrator({ kits }: { kits: GiftKitTemplate[] }) {
  const lastRef = useRef<GiftKitTemplate[] | null>(null);

  if (lastRef.current !== kits) {
    useGiftKitsStore.setState({ kits });
    lastRef.current = kits;
  }

  return null;
}
