"use client";

import { useRef } from "react";

import type { Address } from "@/stores/address-store";
import { useAddressStore } from "@/stores/address-store";

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
  const lastRef = useRef<Address[] | null>(null);

  if (lastRef.current !== addresses) {
    useAddressStore.getState().setAddresses(addresses);
    lastRef.current = addresses;
  }

  return null;
}
