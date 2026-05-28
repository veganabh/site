"use client";

import { useRef } from "react";

import type { AdminSettings } from "@/types/store-settings";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";

/**
 * Hydrator do `useAdminSettingsStore`. Recebe a config da loja (store_settings)
 * fetched server-side e sincroniza com o Zustand. Após
 * `revalidatePath("/", "layout")` de updateStoreSettingsAction, re-hidrata.
 *
 * Hidrata para TODOS (admin + cliente) — cliente precisa do status real
 * (aberta/fechada) na top-bar.
 */
export function AdminSettingsStoreHydrator({ settings }: { settings: AdminSettings }) {
  const lastRef = useRef<AdminSettings | null>(null);

  if (lastRef.current !== settings) {
    useAdminSettingsStore.getState().hydrate(settings);
    lastRef.current = settings;
  }

  return null;
}
