"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MOCK_DELIVERY_RINGS } from "@/lib/mock-delivery-rings";
import { STORE_LOCATION } from "@/lib/store-location";
import { distanceMeters } from "@/lib/haversine";
import type { DeliveryRing } from "@/types/delivery-ring";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type RingsState = {
  rings: DeliveryRing[];
  updateRing: (id: string, patch: Partial<DeliveryRing>) => void;
  setMaxActiveRadius: (meters: number) => void;
  lookupByLatLng: (lat: number, lng: number) => DeliveryRing | null;
  resetToDefaults: () => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRingsStore = create<RingsState>()(
  persist(
    (set, get) => ({
      rings: [...MOCK_DELIVERY_RINGS],

      updateRing(id, patch) {
        set((state) => ({
          rings: state.rings.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },

      setMaxActiveRadius(meters) {
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

      resetToDefaults() {
        set({ rings: [...MOCK_DELIVERY_RINGS] });
      },
    }),
    {
      name: "vegana-rings-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate(state, fromVersion) {
        // Se shape mudar no futuro, resetar para defaults ao invés de crashar
        void fromVersion;
        return { rings: [...MOCK_DELIVERY_RINGS] };
      },
    },
  ),
);
