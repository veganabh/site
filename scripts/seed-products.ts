/**
 * Seed de produtos a partir de `src/__fixtures__/products.ts`.
 *
 * Idempotente — usa UPSERT por slug. Roda quantas vezes precisar:
 * primeira execução insere, próximas atualizam campos que mudaram.
 *
 * Pré-requisitos:
 * - .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Migrations 04 (products) aplicadas no projeto.
 *
 * Uso:
 *   npm run seed:products
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import { productFixtures } from "../src/__fixtures__/products";
import { productToInsert } from "../src/server/supabase/mappers";
import type { Database } from "../src/types/db";

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

  console.log(`→ Seeding ${productFixtures.length} produtos em ${url}\n`);

  let success = 0;
  let failed = 0;

  for (const product of productFixtures) {
    const { id: _legacyId, ...rest } = product;
    const insertRow = productToInsert(rest);

    // slug é UNIQUE PARTIAL (WHERE deleted_at IS NULL) — Supabase upsert não
    // aceita partial index. Faz SELECT-then-INSERT/UPDATE manual.
    const { data: existing, error: selectError } = await supabase
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (selectError) {
      console.error(`✗ ${product.slug} — select: ${selectError.message}`);
      failed++;
      continue;
    }

    const { error } = existing
      ? await supabase.from("products").update(insertRow).eq("id", existing.id)
      : await supabase.from("products").insert(insertRow);

    if (error) {
      console.error(`✗ ${product.slug} — ${error.message}`);
      failed++;
      continue;
    }

    console.log(`✓ ${product.slug} ${existing ? "(updated)" : "(inserted)"}`);
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
