"use client";

import { create } from "zustand";

export type AddressType = "casa" | "trabalho" | "outro";

export type Address = {
  id: string;
  type: AddressType;
  /** Apelido opcional (ex: "Casa da mãe"). Se vazio, usa o tipo capitalizado. */
  nickname: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  /**
   * Taxa de entrega em reais para este endereço.
   * Mock estático — substituir por cálculo real (CEP × raio) quando backend estiver pronto.
   */
  shippingFee: number;
};

type AddressStore = {
  addresses: Address[];
  /** ID do endereço selecionado para a entrega atual. */
  selectedId: string | null;

  selectAddress: (id: string) => void;
  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, patch: Partial<Omit<Address, "id">>) => void;
  removeAddress: (id: string) => void;
};

const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    type: "casa",
    nickname: "Casa",
    street: "Rua das Flores",
    number: "123",
    complement: "Apto 42",
    neighborhood: "Savassi",
    city: "Belo Horizonte",
    state: "MG",
    cep: "30140-110",
    shippingFee: 0,
  },
  {
    id: "addr-2",
    type: "trabalho",
    nickname: "Trabalho",
    street: "Av. do Contorno",
    number: "8000",
    complement: "Sala 305",
    neighborhood: "Santo Agostinho",
    city: "Belo Horizonte",
    state: "MG",
    cep: "30110-120",
    shippingFee: 5,
  },
];

export const useAddressStore = create<AddressStore>((set, get) => ({
  addresses: MOCK_ADDRESSES,
  selectedId: MOCK_ADDRESSES[0].id,

  selectAddress: (id) => set({ selectedId: id }),

  addAddress: (address) => {
    const id = `addr-${Date.now()}`;
    set((state) => ({ addresses: [...state.addresses, { ...address, id }] }));
    // Seleciona automaticamente o novo endereço
    set({ selectedId: id });
  },

  updateAddress: (id, patch) =>
    set((state) => ({
      addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  removeAddress: (id) =>
    set((state) => {
      const remaining = state.addresses.filter((a) => a.id !== id);
      const selectedId =
        state.selectedId === id ? (remaining[0]?.id ?? null) : state.selectedId;
      return { addresses: remaining, selectedId };
    }),
}));

/** Selector: retorna o endereço atualmente selecionado ou null. */
export function selectCurrentAddress(state: AddressStore) {
  return state.addresses.find((a) => a.id === state.selectedId) ?? null;
}
