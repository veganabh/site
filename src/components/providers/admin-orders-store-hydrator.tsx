"use client";

import type { Order } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";

/**
 * Hydrator do `useAdminOrdersStore`.
 *
 * Recebe `orders` fetched server-side (via `listAllOrders`) e sincroniza com o
 * Zustand. Sync acontece em todo render onde a referência da prop muda —
 * `revalidatePath("/", "layout")` em server actions força o root layout a
 * re-buscar e empurrar a lista atualizada pro store, sem flash e sem perder
 * estado UI (newOrderCount, unacknowledgedIds).
 */
export function AdminOrdersStoreHydrator({ orders }: { orders: Order[] }) {
  if (useAdminOrdersStore.getState().orders !== orders) {
    useAdminOrdersStore.setState({ orders });
  }

  return null;
}
