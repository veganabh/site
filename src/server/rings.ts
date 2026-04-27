import "server-only";

import type { DeliveryRing } from "@/types/delivery-ring";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { deliveryRingFromRow } from "@/server/supabase/mappers";

/**
 * Lê todos os 20 anéis de entrega da tabela `public.delivery_rings`.
 * RLS libera SELECT público — qualquer cliente pode ler para calcular frete.
 *
 * Order: ring_order ASC (1 → 20).
 */
export async function listAllRings(): Promise<DeliveryRing[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("delivery_rings")
    .select("*")
    .order("ring_order", { ascending: true });

  if (error) {
    console.error("[server/rings] listAllRings:", error.message);
    return [];
  }

  return (data ?? []).map(deliveryRingFromRow);
}
