"use client";

import { create } from "zustand";
import type { DeliveryPerson } from "@/types/delivery-person";

/**
 * Cache em memória dos entregadores ativos. Fonte da verdade vive em
 * `public.delivery_persons` — hidratado pelo `DeliveryPersonsStoreHydrator`
 * no root layout via `listActiveDeliveryPersons()`.
 *
 * `pickRandom`: sorteia um entregador ativo (usado por
 * `admin-orders-store.callDelivery`). Substituirá-se por Server Action
 * disparando WhatsApp Cloud API quando integração chegar — contrato (id
 * string) não muda.
 *
 * `findById`: lookup síncrono usado pelo drawer/timeline pra renderizar
 * nome+telefone+placa a partir do `delivery_call_id` do pedido.
 */

type DeliveryPersonsState = {
  persons: DeliveryPerson[];
  pickRandom: () => DeliveryPerson | null;
  findById: (id: string | undefined | null) => DeliveryPerson | null;
};

export const useDeliveryPersonsStore = create<DeliveryPersonsState>()((set, get) => ({
  persons: [],

  pickRandom() {
    const active = get().persons.filter((p) => p.active);
    if (active.length === 0) return null;
    const idx = Math.floor(Math.random() * active.length);
    return active[idx];
  },

  findById(id) {
    if (!id) return null;
    return get().persons.find((p) => p.id === id) ?? null;
  },
}));

// Setter externo (usado pelo hidrator).
export const setDeliveryPersons = (persons: DeliveryPerson[]) =>
  useDeliveryPersonsStore.setState({ persons });
