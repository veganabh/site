/**
 * Store admin de cupons — pré-migração Supabase.
 *
 * Referência: ADR 0005 (Zustand + persist para admin-side data pré-migração).
 * Ao migrar pro Supabase: substituir persist por queries à tabela `coupons`.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Coupon } from "@/types/coupon";
import { MOCK_COUPONS } from "@/lib/mock-coupons-admin";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type AdminCouponsState = {
  coupons: Coupon[];
};

type CreateResult = { success: boolean; error?: string };

type AdminCouponsActions = {
  /** Cria novo cupom. Valida unicidade do código (case-insensitive). */
  create: (coupon: Omit<Coupon, "id" | "createdAt" | "usedCount">) => CreateResult;
  /** Atualiza campos de um cupom existente pelo id. */
  update: (id: string, patch: Partial<Omit<Coupon, "id" | "createdAt">>) => void;
  /** Remove cupom pelo id. */
  delete: (id: string) => void;
  /**
   * Alterna status ATIVO ↔ INATIVO.
   * Cupons com status EXPIRADO não são alterados.
   */
  toggleStatus: (id: string) => void;
  /** Retorna todos os cupons. */
  getAll: () => Coupon[];
  /** Retorna cupom pelo id, ou undefined. */
  getById: (id: string) => Coupon | undefined;
};

type AdminCouponsStore = AdminCouponsState & AdminCouponsActions;

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAdminCouponsStore = create<AdminCouponsStore>()(
  persist(
    (set, get) => ({
      // Estado inicial com seed de mocks — substituído pela hidratação se localStorage já tiver dados.
      coupons: [...MOCK_COUPONS],

      create: (input) => {
        const normalizedCode = input.code.toUpperCase().trim();

        const duplicate = get().coupons.some((c) => c.code.toUpperCase() === normalizedCode);
        if (duplicate) {
          return { success: false, error: "Código já utilizado." };
        }

        const newCoupon: Coupon = {
          ...input,
          code: normalizedCode,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          usedCount: 0,
        };

        set((s) => ({ coupons: [...s.coupons, newCoupon] }));
        return { success: true };
      },

      update: (id, patch) => {
        set((s) => ({
          coupons: s.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      delete: (id) => {
        set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
      },

      toggleStatus: (id) => {
        set((s) => ({
          coupons: s.coupons.map((c) => {
            if (c.id !== id) return c;
            if (c.status === "EXPIRADO") return c;
            return {
              ...c,
              status: c.status === "ATIVO" ? "INATIVO" : "ATIVO",
            };
          }),
        }));
      },

      getAll: () => get().coupons,

      getById: (id) => get().coupons.find((c) => c.id === id),
    }),
    {
      name: "vegana.admin-coupons",
      storage: createJSONStorage(() => localStorage),
      // Se a store hidratou mas veio vazia (primeira vez com chave existente mas vazia),
      // manter os mocks. O merge padrão do persist já faz union de estado.
      onRehydrateStorage: () => (state) => {
        if (state && state.coupons.length === 0) {
          state.coupons = [...MOCK_COUPONS];
        }
      },
    },
  ),
);
