import "server-only";

import type { Order, OrderStatus } from "@/types/order";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { orderFromRow } from "@/server/supabase/mappers";

/**
 * Reads de orders. RLS já filtra:
 *  - SELECT orders: `auth.uid() = profile_id OR is_admin()`.
 *  - Idem para order_items e order_status_history (via subquery).
 *
 * Estratégia: 1 query orders + 1 query items (IN order_ids) + 1 query history.
 * Join em memória. Volume típico do dia: dezenas, não milhares.
 */

async function joinItemsAndHistory(orderRows: ReadonlyArray<Record<string, unknown>>) {
  const supabase = await createSupabaseServerClient();
  const ids = orderRows.map((o) => o.id as string);
  if (ids.length === 0) {
    return { itemsByOrder: new Map<string, unknown[]>(), historyByOrder: new Map<string, unknown[]>() };
  }

  const [itemsRes, historyRes] = await Promise.all([
    supabase.from("order_items").select("*").in("order_id", ids),
    supabase
      .from("order_status_history")
      .select("*")
      .in("order_id", ids)
      .order("at", { ascending: true }),
  ]);

  if (itemsRes.error) {
    console.error("[server/orders] items:", itemsRes.error.message);
  }
  if (historyRes.error) {
    console.error("[server/orders] history:", historyRes.error.message);
  }

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

export async function listAllOrders(): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[server/orders] listAllOrders:", error.message);
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

export async function listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[server/orders] listOrdersByStatus:", error.message);
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

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[server/orders] getOrderById:", error.message);
    return null;
  }
  if (!row) return null;

  const [itemsRes, historyRes] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("at", { ascending: true }),
  ]);

  return orderFromRow(
    row as unknown as Parameters<typeof orderFromRow>[0],
    (itemsRes.data ?? []) as unknown as Parameters<typeof orderFromRow>[1],
    (historyRes.data ?? []) as unknown as Parameters<typeof orderFromRow>[2],
  );
}

export async function listOrdersByProfile(profileId: string): Promise<Order[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[server/orders] listOrdersByProfile:", error.message);
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
