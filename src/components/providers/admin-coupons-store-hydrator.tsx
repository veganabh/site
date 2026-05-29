"use client";

import { useEffect } from "react";

import type { Coupon } from "@/types/coupon";
import { useAdminCouponsStore } from "@/stores/admin-coupons-store";

const LEGACY_PERSIST_KEY = "vegana.admin-coupons";
const CLEANUP_FLAG_KEY = "vegana.admin-coupons-cleanup-v1";

/**
 * Hidrata `useAdminCouponsStore` com cupons fetchados pela RSC. Sync acontece
 * em todo render onde a referência da prop muda — após `revalidatePath` o
 * server re-fetcha e empurra a lista atualizada sem flash.
 *
 * Cleanup one-shot: versão antiga persistia store em localStorage. Agora a
 * fonte é o DB — limpamos a chave legada uma vez por browser.
 */
export function AdminCouponsStoreHydrator({ coupons }: { coupons: Coupon[] }) {
  if (useAdminCouponsStore.getState().coupons !== coupons) {
    useAdminCouponsStore.setState({ coupons });
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(CLEANUP_FLAG_KEY)) return;
      window.localStorage.removeItem(LEGACY_PERSIST_KEY);
      window.localStorage.setItem(CLEANUP_FLAG_KEY, "1");
    } catch {
      // localStorage indisponível — ignorar.
    }
  }, []);

  return null;
}
