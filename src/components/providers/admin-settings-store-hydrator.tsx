"use client";

import type { AdminSettings } from "@/types/store-settings";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";

/**
 * Última prop sincronizada. Guard fora do render (não `useRef` —
 * viola react-hooks/refs). `hydrate` espalha os campos no store, então não há
 * um `settings` em `getState()` para comparar; comparamos a prop crua.
 * Hydrator é singleton no root client — módulo global é seguro aqui.
 */
let lastSettings: AdminSettings | null = null;

/**
 * Hydrator do `useAdminSettingsStore`. Recebe a config da loja (store_settings)
 * fetched server-side e sincroniza com o Zustand. Após
 * `revalidatePath("/", "layout")` de updateStoreSettingsAction, re-hidrata.
 *
 * Hidrata para TODOS (admin + cliente) — cliente precisa do status real
 * (aberta/fechada) na top-bar.
 */
export function AdminSettingsStoreHydrator({ settings }: { settings: AdminSettings }) {
  if (lastSettings !== settings) {
    useAdminSettingsStore.getState().hydrate(settings);
    lastSettings = settings;
  }

  return null;
}
