/**
 * Store de configurações operacionais da loja — pré-migração Supabase.
 *
 * Referência: ADR 0005 (Zustand + persist para admin-side data pré-migração).
 * Ao migrar: substituir persist por leitura/escrita na tabela `store_settings`.
 *
 * Contém:
 *  - storeStatus: ATIVO | PAUSADO (liga/desliga aceite de pedidos)
 *  - hours: horário de funcionamento por dia da semana (informativo por ora)
 *  - printerEnabled / printerName: stub de impressora térmica (Fase 5)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type DayHours = {
  open: boolean;
  /** Formato "HH:MM" */
  from: string;
  /** Formato "HH:MM" */
  to: string;
};

export type WeekHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  DayHours
>;

export type StoreStatus = "ATIVO" | "PAUSADO";

export type AdminSettings = {
  storeStatus: StoreStatus;
  hours: WeekHours;
  printerEnabled: boolean;
  printerName: string;
};

// ── Seed (valores iniciais) ────────────────────────────────────────────────────

const SEED_HOURS: WeekHours = {
  mon: { open: false, from: "09:00", to: "19:00" },
  tue: { open: true, from: "09:00", to: "19:00" },
  wed: { open: true, from: "09:00", to: "19:00" },
  thu: { open: true, from: "09:00", to: "19:00" },
  fri: { open: true, from: "09:00", to: "19:00" },
  sat: { open: true, from: "10:00", to: "18:00" },
  sun: { open: true, from: "11:00", to: "17:00" },
};

const SEED: AdminSettings = {
  storeStatus: "ATIVO",
  hours: SEED_HOURS,
  printerEnabled: false,
  printerName: "",
};

// ── Ações ──────────────────────────────────────────────────────────────────────

type AdminSettingsActions = {
  setStoreStatus: (status: StoreStatus) => void;
  updateDayHours: (day: keyof WeekHours, patch: Partial<DayHours>) => void;
  toggleDayOpen: (day: keyof WeekHours) => void;
  setPrinterEnabled: (enabled: boolean) => void;
  setPrinterName: (name: string) => void;
  /** Restaura todos os valores ao seed inicial. */
  reset: () => void;
};

export type AdminSettingsStore = AdminSettings & AdminSettingsActions;

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAdminSettingsStore = create<AdminSettingsStore>()(
  persist(
    (set) => ({
      ...SEED,

      setStoreStatus: (status) => set({ storeStatus: status }),

      updateDayHours: (day, patch) =>
        set((s) => ({
          hours: {
            ...s.hours,
            [day]: { ...s.hours[day], ...patch },
          },
        })),

      toggleDayOpen: (day) =>
        set((s) => ({
          hours: {
            ...s.hours,
            [day]: { ...s.hours[day], open: !s.hours[day].open },
          },
        })),

      setPrinterEnabled: (enabled) => set({ printerEnabled: enabled }),

      setPrinterName: (name) => set({ printerName: name }),

      reset: () => set({ ...SEED }),
    }),
    {
      name: "vegana.admin-settings",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Garante que campos ausentes (schema evolution) voltem ao seed
        if (state && !state.hours) {
          state.hours = { ...SEED_HOURS };
        }
      },
    },
  ),
);
