import "server-only";

import type { Coupon } from "@/types/coupon";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { couponFromRow } from "@/server/supabase/mappers";

/**
 * Lê todos os cupons não soft-deletados. Acesso restrito por RLS — apenas
 * admin recebe rows. Cliente não-admin recebe array vazio (RLS filtra
 * silenciosamente).
 *
 * Usado por `/gestao/cupons` (RSC) e `/gestao/modulos` (contagem no card).
 */
export async function listAdminCoupons(): Promise<Coupon[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[server/coupons] listAdminCoupons:", error.message);
    return [];
  }

  return (data ?? []).map(couponFromRow);
}
