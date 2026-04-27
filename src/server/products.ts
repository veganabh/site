import "server-only";

import type { Product, ProductCategory, ProductTag } from "@/types/product";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { productFromRow } from "@/server/supabase/mappers";
import { getCollectionBySlug } from "@/server/collections";

/**
 * Catálogo de produtos do Supabase. RLS já filtra `active=true` e
 * `deleted_at IS NULL` pra não-admin — admin vê tudo.
 *
 * Coleções são curadas em `public.collections.product_ids` (uuid[]). Quando
 * `collection` é passado, busca a coleção, lista produtos e reordena
 * preservando a curadoria.
 */
export async function listProducts(opts?: {
  category?: ProductCategory;
  tag?: ProductTag;
  collection?: string;
  /** Default true — RLS garante isso pra não-admin de qualquer forma. */
  onlyActive?: boolean;
  query?: string;
}): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("products").select("*").is("deleted_at", null);

  if (opts?.onlyActive ?? true) {
    query = query.eq("active", true);
  }

  if (opts?.category) {
    query = query.eq("category", opts.category);
  }

  if (opts?.tag) {
    query = query.contains("tags", [opts.tag]);
  }

  const q = opts?.query?.trim();
  if (q) {
    const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
    query = query.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("[server/products] listProducts:", error.message);
    return [];
  }

  const products = (data ?? []).map(productFromRow);

  // Coleção customizada — filtra + preserva ordem dos productIds (UUIDs).
  if (opts?.collection) {
    const col = await getCollectionBySlug(opts.collection);
    if (!col) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return col.productIds
      .map((id) => byId.get(id))
      .filter((p): p is Product => !!p);
  }

  return products;
}

/**
 * Busca um produto pelo slug. Retorna `null` se não existir, estiver
 * inativo ou soft-deleted.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[server/products] getProductBySlug:", error.message);
    return null;
  }

  return data ? productFromRow(data) : null;
}
