"use client";

import { useEffect } from "react";

import type { DeliveryRing } from "@/types/delivery-ring";
import { useRingsStore } from "@/stores/rings-store";

const LEGACY_PERSIST_KEY = "vegana-rings-v1";
const CLEANUP_FLAG_KEY = "vegana-rings-cleanup-v1";

/**
 * Hidrata `useRingsStore` com a lista de anéis vinda do server (root layout).
 * Sync acontece em todo render onde a referência da prop muda — após
 * `revalidatePath("/", "layout")` o root layout re-fetcha e empurra a lista
 * atualizada pro store sem flash.
 *
 * Cleanup one-shot: versões antigas persistiam o store em localStorage
 * (`vegana-rings-v1`). Agora a fonte é o DB — limpamos a chave legada uma
 * única vez por browser para evitar divergência durante hidratação inicial.
 */
export function RingsStoreHydrator({ rings }: { rings: DeliveryRing[] }) {
  if (useRingsStore.getState().rings !== rings) {
    useRingsStore.setState({ rings });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(CLEANUP_FLAG_KEY)) return;
      window.localStorage.removeItem(LEGACY_PERSIST_KEY);
      window.localStorage.setItem(CLEANUP_FLAG_KEY, "1");
    } catch {
      // localStorage indisponível (modo privado, quota) — ignorar.
    }
  }, []);

  return null;
}
