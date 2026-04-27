"use client";

import { create } from "zustand";

export type AddressType = "casa" | "trabalho" | "outro";

export type Address = {
  id: string;
  type: AddressType;
  /** Apelido — ex: "Casa", "Trabalho", "Casa da mãe". Persistido como `label`. */
  nickname: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  /** Latitude pra cálculo de frete. Geocode preenche em fase 2. */
  lat?: number;
  /** Longitude pra cálculo de frete. */
  lng?: number;
  /** Endereço default do usuário. Único por profile. */
  isDefault: boolean;
  /**
   * Taxa de entrega em reais. Computed via delivery_rings + lat/lng (TODO).
   * Hoje fixo em 0 — substituir quando geocoding entrar.
   */
  shippingFee: number;
};

type AddressStore = {
  addresses: Address[];
  /** ID do endereço selecionado pra entrega atual. */
  selectedId: string | null;
  /** True após primeira hidratação do servidor. */
  hydrated: boolean;

  setAddresses: (list: Address[]) => void;
  selectAddress: (id: string) => void;
  upsertAddress: (address: Address) => void;
  removeAddressLocal: (id: string) => void;
};

export const useAddressStore = create<AddressStore>((set) => ({
  addresses: [],
  selectedId: null,
  hydrated: false,

  setAddresses: (list) =>
    set((state) => {
      // Preserva selectedId se ainda existe na nova lista; senão pega default
      // ou primeiro endereço; null se lista vazia.
      const stillExists = list.some((a) => a.id === state.selectedId);
      const fallback = list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null;
      return {
        addresses: list,
        selectedId: stillExists ? state.selectedId : fallback,
        hydrated: true,
      };
    }),

  selectAddress: (id) => set({ selectedId: id }),

  upsertAddress: (address) =>
    set((state) => {
      const exists = state.addresses.some((a) => a.id === address.id);
      const addresses = exists
        ? state.addresses.map((a) => (a.id === address.id ? address : a))
        : [...state.addresses, address];

      // Se o endereço novo é default, desmarca os outros (espelha o índice unique do BD).
      const normalized = address.isDefault
        ? addresses.map((a) => (a.id === address.id ? a : { ...a, isDefault: false }))
        : addresses;

      return {
        addresses: normalized,
        selectedId: state.selectedId ?? address.id,
      };
    }),

  removeAddressLocal: (id) =>
    set((state) => {
      const remaining = state.addresses.filter((a) => a.id !== id);
      const selectedId = state.selectedId === id ? (remaining[0]?.id ?? null) : state.selectedId;
      return { addresses: remaining, selectedId };
    }),
}));

/** Selector: retorna o endereço atualmente selecionado ou null. */
export function selectCurrentAddress(state: AddressStore) {
  return state.addresses.find((a) => a.id === state.selectedId) ?? null;
}

/**
 * Heurística pra classificar o tipo do endereço a partir do label/nickname.
 * Persistimos só `label` no DB (`user_addresses.label`). Type é derivado pra UI
 * (chip + ícone). Heurística simples: matches case-insensitive em palavras-chave.
 */
export function inferAddressType(label: string): AddressType {
  const normalized = label.toLowerCase().trim();
  if (
    normalized === "casa" ||
    normalized.startsWith("casa ") ||
    normalized.includes(" casa")
  ) {
    return "casa";
  }
  if (
    normalized === "trabalho" ||
    normalized.startsWith("trabalho") ||
    normalized.includes("escritório") ||
    normalized.includes("escritorio") ||
    normalized.includes("empresa")
  ) {
    return "trabalho";
  }
  return "outro";
}
