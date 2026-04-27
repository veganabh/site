/**
 * Seed da curadoria de coleções (super-categorias).
 *
 * A migration 13 cria a row "presentear" estrutural com product_ids vazio.
 * Este script popula product_ids com os UUIDs dos produtos curados pela
 * configuração CURATED_COLLECTIONS abaixo (slugs estáveis → UUIDs reais).
 *
 * Idempotente — sempre faz UPDATE replace-all do product_ids.
 *
 * Pré-requisitos:
 * - .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Migrations 04 (products) e 13 (collections) aplicadas.
 * - `npm run seed:products` rodado antes (resolve slugs em UUIDs).
 *
 * Uso:
 *   npm run seed:collections
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/db";

/**
 * Curadoria editorial pre-Supabase, agora resolvida em runtime.
 * Edite aqui pra mover produtos entre coleções no seed.
 */
const CURATED_COLLECTIONS: Array<{ slug: string; productSlugs: string[] }> = [
  {
    slug: "presentear",
    productSlugs: ["brownie-chocolate", "bombom-brigadeiro", "beijinho-coco", "brigadeiro-gourmet"],
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`→ Seeding ${CURATED_COLLECTIONS.length} coleções em ${url}\n`);

  let success = 0;
  let failed = 0;

  for (const curated of CURATED_COLLECTIONS) {
    // 1. Resolve slug → UUID nos products
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug")
      .in("slug", curated.productSlugs)
      .is("deleted_at", null);

    if (productsError) {
      console.error(`✗ ${curated.slug} — fetch produtos: ${productsError.message}`);
      failed++;
      continue;
    }

    const bySlug = new Map((products ?? []).map((p) => [p.slug, p.id]));
    const missing = curated.productSlugs.filter((s) => !bySlug.has(s));
    if (missing.length > 0) {
      console.warn(
        `! ${curated.slug} — produtos não encontrados (rode seed-products primeiro?): ${missing.join(", ")}`,
      );
    }

    const productIds = curated.productSlugs
      .map((s) => bySlug.get(s))
      .filter((id): id is string => Boolean(id));

    // 2. Update product_ids preservando ordem da curadoria
    const { error: updateError } = await supabase
      .from("collections")
      .update({ product_ids: productIds })
      .eq("slug", curated.slug)
      .is("deleted_at", null);

    if (updateError) {
      console.error(`✗ ${curated.slug} — update: ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(`✓ ${curated.slug} — ${productIds.length} produtos`);
    success++;
  }

  console.log(`\nResultado: ${success} ok · ${failed} erros.`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
