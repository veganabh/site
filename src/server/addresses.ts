import "server-only";

import type { Address } from "@/stores/address-store";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { addressFromRow } from "@/server/supabase/mappers";

/**
 * Lista endereços ativos do usuário logado. Retorna `[]` se anon ou erro.
 *
 * RLS já filtra `auth.uid() = profile_id`, então qualquer chamada autenticada
 * retorna apenas os endereços do dono. Para anon, sem cookie válido o RLS
 * retorna 0 linhas — comportamento esperado.
 */
export async function listMyAddresses(): Promise<Address[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_addresses")
    .select(
      "id,profile_id,label,street,number,complement,neighborhood,city,state,cep,lat,lng,is_default,deleted_at",
    )
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[server/addresses] listMyAddresses:", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    addressFromRow(row as Parameters<typeof addressFromRow>[0]),
  );
}
