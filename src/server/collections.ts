import "server-only";

import type { Collection } from "@/types/collection";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { collectionFromRow } from "@/server/supabase/mappers";

/**
 * Coleções customizadas (super-categorias curadas) do Supabase.
 *
 * RLS já filtra `active=true AND deleted_at IS NULL` pra não-admin.
 * Admin vê tudo — passar `onlyActive: false` no hidrador root só evita
 * filtro client-side; o gate real é o RLS.
 */
export async function listCollections(opts?: { onlyActive?: boolean }): Promise<Collection[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("collections").select("*").is("deleted_at", null);

  if (opts?.onlyActive ?? true) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) {
    console.error("[server/collections] listCollections:", error.message);
    return [];
  }

  return (data ?? []).map(collectionFromRow);
}

/**
 * Busca coleção pelo slug. Retorna `null` se não existir, estiver inativa
 * ou soft-deleted (RLS aplica esse filtro pra não-admin).
 */
export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[server/collections] getCollectionBySlug:", error.message);
    return null;
  }

  return data ? collectionFromRow(data) : null;
}
