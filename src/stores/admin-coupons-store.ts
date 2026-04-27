"use client";

import { create } from "zustand";
import type { Coupon } from "@/types/coupon";

/**
 * Cache em memória dos cupons admin. Fonte da verdade vive na tabela
 * `public.coupons` do Supabase — este store é hidratado pelo
 * `AdminCouponsStoreHydrator` na rota `/gestao/cupons`. Mutações: server
 * actions em `src/server/actions/coupons.ts` + optimistic update via
 * `applyOptimistic*` chamado pelos componentes de UI admin.
 */

type AdminCouponsState = {
  coupons: Coupon[];
  setCoupons: (coupons: Coupon[]) => void;
  applyOptimisticUpsert: (coupon: Coupon) => void;
  applyOptimisticUpdate: (id: string, patch: Partial<Coupon>) => void;
  applyOptimisticRemove: (id: string) => void;
};

export const useAdminCouponsStore = create<AdminCouponsState>()((set) => ({
  coupons: [],

  setCoupons(coupons) {
    set({ coupons });
  },

  applyOptimisticUpsert(coupon) {
    set((state) => {
      const exists = state.coupons.some((c) => c.id === coupon.id);
      const next = exists
        ? state.coupons.map((c) => (c.id === coupon.id ? { ...c, ...coupon } : c))
        : [coupon, ...state.coupons];
      return { coupons: next };
    });
  },

  applyOptimisticUpdate(id, patch) {
    set((state) => ({
      coupons: state.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  applyOptimisticRemove(id) {
    set((state) => ({
      coupons: state.coupons.filter((c) => c.id !== id),
    }));
  },
}));
