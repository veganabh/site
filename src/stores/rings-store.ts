"use client";

import { create } from "zustand";
import { STORE_LOCATION } from "@/lib/store-location";
import { distanceMeters } from "@/lib/haversine";
import type { DeliveryRing } from "@/types/delivery-ring";

/**
 * Cache em memória dos anéis de entrega. Fonte da verdade vive na tabela
 * `public.delivery_rings` do Supabase — este store é hidratado pelo
 * `RingsStoreHydrator` no root layout a partir de `listAllRings()` server.
 *
 * Mutações: server actions em `src/server/actions/rings.ts` + optimistic
 * update via `applyOptimistic*` chamado pelos componentes admin.
 *
 * `lookupByLatLng` é função pura sobre o array já hidratado — usado pelo
 * checkout/CEP test sem round-trip ao server.
 */

type RingsState = {
  rings: DeliveryRing[];
  setRings: (rings: DeliveryRing[]) => void;
  applyOptimisticUpdate: (id: string, patch: Partial<DeliveryRing>) => void;
  applyOptimisticSetMaxRadius: (meters: number) => void;
  lookupByLatLng: (lat: number, lng: number) => DeliveryRing | null;
};

export const useRingsStore = create<RingsState>()((set, get) => ({
  rings: [],

  setRings(rings) {
    set({ rings });
  },

  applyOptimisticUpdate(id, patch) {
    set((state) => ({
      rings: state.rings.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },

  applyOptimisticSetMaxRadius(meters) {
    set((state) => ({
      rings: state.rings.map((r) => ({
        ...r,
        active: r.outerRadiusM <= meters,
      })),
    }));
  },

  lookupByLatLng(lat, lng) {
    const dist = distanceMeters(
      { lat, lng },
      { lat: STORE_LOCATION.lat, lng: STORE_LOCATION.lng },
    );

    const sorted = [...get().rings].sort((a, b) => a.order - b.order);
    return (
      sorted.find((r) => r.active && dist >= r.innerRadiusM && dist < r.outerRadiusM) ?? null
    );
  },
}));
