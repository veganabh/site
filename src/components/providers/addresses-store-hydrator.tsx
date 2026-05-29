"use client";

import type { Address } from "@/stores/address-store";
import { useAddressStore } from "@/stores/address-store";

/**
 * Última prop sincronizada. Guard de identidade fora do render (não pode ser
 * `useRef` — viola react-hooks/refs). `setAddresses` normaliza a lista, então
 * comparar contra `getState().addresses` não serve; comparamos a prop crua.
 * Hydrator é singleton no root client — módulo global é seguro aqui.
 */
let lastAddresses: Address[] | null = null;

/**
 * Hydrator do `useAddressStore`.
 *
 * Recebe `addresses` fetched server-side (filtrados por RLS pro user logado)
 * e sincroniza com o Zustand. Sync acontece em todo render onde a referência
 * da prop muda — após `revalidatePath("/", "layout")` de uma server action
 * (add/update/remove address), o root layout re-busca e empurra a lista
 * atualizada pro store.
 *
 * Anon = lista vazia. Login → revalidação puxa endereços do user.
 */
export function AddressesStoreHydrator({ addresses }: { addresses: Address[] }) {
  if (lastAddresses !== addresses) {
    useAddressStore.getState().setAddresses(addresses);
    lastAddresses = addresses;
  }

  return null;
}
