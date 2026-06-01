import "server-only";

/**
 * Queries de encomendas (order_type='preorder').
 * Reaproveitam joinItemsAndHistory do módulo orders.
 */

import type { Order } from "@/types/order";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { orderFromRow } from "@/server/supabase/mappers";

async function joinItemsAndHistory(orderRows: ReadonlyArray<Record<string, unknown>>) {
  const supabase = await createSupabaseServerClient();
  const ids = orderRows.map((o) => o.id as string);
  if (ids.length === 0) {
    return {
      itemsByOrder: new Map<string, unknown[]>(),
      historyByOrder: new Map<string, unknown[]>(),
    };
  }

  const [itemsRes, historyRes] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", ids),
    supabase
      .from("order_status_history")
      .select("*")
      .in("order_id", ids)
      .order("at", { ascending: true }),
  ]);

  const itemsByOrder = new Map<string, unknown[]>();
  for (const item of itemsRes.data ?? []) {
    const orderId = (item as { order_id: string }).order_id;
    const list = itemsByOrder.get(orderId) ?? [];
    list.push(item);
    itemsByOrder.set(orderId, list);
  }

  const historyByOrder = new Map<string, unknown[]>();
  for (const h of historyRes.data ?? []) {
    const orderId = (h as { order_id: string }).order_id;
    const list = historyByOrder.get(orderId) ?? [];
    list.push(h);
    historyByOrder.set(orderId, list);
  }

  return { itemsByOrder, historyByOrder };
}

/** Lista todas as encomendas (admin). Ordenadas por scheduled_date asc. */
export async function listAllPreorders(): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "preorder")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_hour", { ascending: true });

  if (error) {
    console.error("[server/preorders] listAllPreorders:", error.message);
    return [];
  }

  const rows = data ?? [];
  const { itemsByOrder, historyByOrder } = await joinItemsAndHistory(rows);

  return rows.map((row) =>
    orderFromRow(
      row as unknown as Parameters<typeof orderFromRow>[0],
      (itemsByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[1],
      (historyByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[2],
    ),
  );
}

/** Lista encomendas por data agendada (calendário). */
export async function listPreordersByDate(date: string): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "preorder")
    .eq("scheduled_date", date)
    .order("scheduled_hour", { ascending: true });

  if (error) {
    console.error("[server/preorders] listPreordersByDate:", error.message);
    return [];
  }

  const rows = data ?? [];
  const { itemsByOrder, historyByOrder } = await joinItemsAndHistory(rows);

  return rows.map((row) =>
    orderFromRow(
      row as unknown as Parameters<typeof orderFromRow>[0],
      (itemsByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[1],
      (historyByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[2],
    ),
  );
}

/**
 * Retorna contagem de encomendas pagas e ativas por data futura.
 * Usado pelo date-picker para bloquear dias cheios.
 */
export async function getPreorderCapacityByDate(
  fromDate: string,
  toDate: string,
): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("scheduled_date")
    .eq("order_type", "preorder")
    .eq("payment_status", "PAGO")
    .neq("status", "CANCELADO")
    .gte("scheduled_date", fromDate)
    .lte("scheduled_date", toDate);

  if (error) {
    console.error("[server/preorders] getPreorderCapacityByDate:", error.message);
    return {};
  }

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    const d = row.scheduled_date as string;
    result[d] = (result[d] ?? 0) + 1;
  }
  return result;
}

/**
 * Lista encomendas de um perfil específico (página "Minhas Encomendas" — cliente).
 */
export async function listPreordersByProfile(profileId: string): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_type", "preorder")
    .eq("profile_id", profileId)
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("[server/preorders] listPreordersByProfile:", error.message);
    return [];
  }

  const rows = data ?? [];
  const { itemsByOrder, historyByOrder } = await joinItemsAndHistory(rows);

  return rows.map((row) =>
    orderFromRow(
      row as unknown as Parameters<typeof orderFromRow>[0],
      (itemsByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[1],
      (historyByOrder.get(row.id) ?? []) as unknown as Parameters<typeof orderFromRow>[2],
    ),
  );
}
