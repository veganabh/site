import "server-only";

import type { DeliveryPerson } from "@/types/delivery-person";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { deliveryPersonFromRow } from "@/server/supabase/mappers";

/**
 * Lê entregadores ativos (active=true, deleted_at IS NULL) de
 * `public.delivery_persons`. RLS exige autenticação — chamar só em
 * superfícies admin/cliente logado. Sorteio em callDelivery acontece
 * no cliente via store.
 */
export async function listActiveDeliveryPersons(): Promise<DeliveryPerson[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_persons")
    .select("*")
    .eq("active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("[server/delivery-persons] listActiveDeliveryPersons:", error.message);
    return [];
  }

  return (data ?? []).map(deliveryPersonFromRow);
}

export async function getDeliveryPersonById(id: string): Promise<DeliveryPerson | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_persons")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[server/delivery-persons] getDeliveryPersonById:", error.message);
    return null;
  }
  if (!data) return null;
  return deliveryPersonFromRow(data);
}
