import "server-only";

import type { Category } from "@/types/category";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { categoryFromRow } from "@/server/supabase/mappers";

/**
 * Lista categorias do Supabase, ordenadas por sort_order. SELECT é público
 * (RLS), então funciona pra cliente e admin. Filtra soft-deleted.
 *
 * @param opts.onlyActive default false — layout hidrata todas (admin precisa
 *   ver inativas no gerenciador). Consumidores públicos filtram via selector.
 */
export async function listCategories(opts?: { onlyActive?: boolean }): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (opts?.onlyActive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[categories/list]", error?.message);
    return [];
  }

  return data.map(categoryFromRow);
}
