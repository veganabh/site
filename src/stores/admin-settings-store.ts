/**
 * Store de configurações operacionais da loja.
 *
 * Fonte da verdade agora é a tabela `store_settings` (Supabase). Este store é
 * cache client hidratado via AdminSettingsStoreHydrator (no layout). Setters
 * são otimistas (UI instantânea); a persistência real acontece via
 * `updateStoreSettingsAction` chamado na página de configurações.
 *
 * Sem `persist` — o localStorage não é mais fonte (causava o bug do status
 * não refletir pro cliente em outro device).
 */

import { create } from "zustand";
import {
  SEED_SETTINGS,
  type AdminSettings,
  type DayHours,
  type StoreStatus,
  type WeekHours,
} from "@/types/store-settings";

// Re-export para back-compat de quem importava os tipos deste módulo.
export type { AdminSettings, DayHours, StoreStatus, WeekHours };

// ── Ações ──────────────────────────────────────────────────────────────────────

type AdminSettingsActions = {
  /** Sincroniza o store com o estado vindo do servidor (hydrator). */
  hydrate: (settings: AdminSettings) => void;
  setStoreStatus: (status: StoreStatus) => void;
  updateDayHours: (day: keyof WeekHours, patch: Partial<DayHours>) => void;
  toggleDayOpen: (day: keyof WeekHours) => void;
  setPrinterEnabled: (enabled: boolean) => void;
  setPrinterName: (name: string) => void;
  reset: () => void;
};

export type AdminSettingsStore = AdminSettings & AdminSettingsActions;

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAdminSettingsStore = create<AdminSettingsStore>()((set) => ({
  ...SEED_SETTINGS,

  hydrate: (settings) => set({ ...settings }),

  setStoreStatus: (status) => set({ storeStatus: status }),

  updateDayHours: (day, patch) =>
    set((s) => ({
      hours: { ...s.hours, [day]: { ...s.hours[day], ...patch } },
    })),

  toggleDayOpen: (day) =>
    set((s) => ({
      hours: { ...s.hours, [day]: { ...s.hours[day], open: !s.hours[day].open } },
    })),

  setPrinterEnabled: (enabled) => set({ printerEnabled: enabled }),

  setPrinterName: (name) => set({ printerName: name }),

  reset: () => set({ ...SEED_SETTINGS }),
}));
