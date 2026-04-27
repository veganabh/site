/**
 * Seed de entregadores (motoqueiros) a partir de
 * `src/__fixtures__/delivery-persons.ts`.
 *
 * Comportamento:
 * - SELECT-then-INSERT/UPDATE por phone (índice único parcial WHERE deleted_at
 *   IS NULL — Supabase upsert não aceita partial index). Idempotente.
 * - active=true por padrão.
 *
 * Pré-requisitos:
 * - .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Migration 14 (delivery_persons) aplicada.
 *
 * Uso:
 *   npm run seed:delivery-persons
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import { deliveryPersonFixtures } from "../src/__fixtures__/delivery-persons";
import { deliveryPersonToInsert } from "../src/server/supabase/mappers";
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

  console.log(`[seed:delivery-persons] seeding ${deliveryPersonFixtures.length} persons em ${url}\n`);

  let success = 0;
  let failed = 0;

  for (const person of deliveryPersonFixtures) {
    const insertRow = deliveryPersonToInsert(person);

    const { data: existing, error: selectError } = await supabase
      .from("delivery_persons")
      .select("id")
      .eq("phone", person.phone)
      .is("deleted_at", null)
      .maybeSingle();

    if (selectError) {
      console.error(`✗ ${person.name} — select: ${selectError.message}`);
      failed++;
      continue;
    }

    const { error } = existing
      ? await supabase.from("delivery_persons").update(insertRow).eq("id", existing.id)
      : await supabase.from("delivery_persons").insert(insertRow);

    if (error) {
      console.error(`✗ ${person.name} — ${error.message}`);
      failed++;
      continue;
    }

    console.log(`✓ ${person.name} (${person.phone}) ${existing ? "(updated)" : "(inserted)"}`);
    success++;
  }

  console.log(`\nResultado: ${success} ok · ${failed} erros.`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
