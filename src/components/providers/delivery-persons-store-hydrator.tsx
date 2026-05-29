"use client";

import type { DeliveryPerson } from "@/types/delivery-person";
import { useDeliveryPersonsStore } from "@/stores/delivery-persons-store";

/**
 * Hidrata `useDeliveryPersonsStore` com a lista de entregadores ativos
 * vinda do server (root layout). Sync em todo render onde a referência
 * da prop muda — após `revalidatePath` o root layout re-fetcha e
 * empurra a lista atualizada sem flash.
 */
export function DeliveryPersonsStoreHydrator({ persons }: { persons: DeliveryPerson[] }) {
  if (useDeliveryPersonsStore.getState().persons !== persons) {
    useDeliveryPersonsStore.setState({ persons });
  }

  return null;
}
