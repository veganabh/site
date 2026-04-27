"use client";

import { useRef } from "react";
import type { DeliveryPerson } from "@/types/delivery-person";
import { useDeliveryPersonsStore } from "@/stores/delivery-persons-store";

/**
 * Hidrata `useDeliveryPersonsStore` com a lista de entregadores ativos
 * vinda do server (root layout). Sync em todo render onde a referência
 * da prop muda — após `revalidatePath` o root layout re-fetcha e
 * empurra a lista atualizada sem flash.
 */
export function DeliveryPersonsStoreHydrator({ persons }: { persons: DeliveryPerson[] }) {
  const lastRef = useRef<DeliveryPerson[] | null>(null);

  if (lastRef.current !== persons) {
    useDeliveryPersonsStore.setState({ persons });
    lastRef.current = persons;
  }

  return null;
}
