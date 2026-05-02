/**
 * Sincroniza produtos Veg.ana com a AbacatePay.
 *
 * Uso:
 *   npm run abacatepay:sync-products
 *
 * O que faz:
 *  1. Lista produtos ativos no Supabase (sem `abacatepay_product_id`).
 *  2. Pra cada um, chama `POST /v2/products/create` com os dados.
 *  3. Salva o `id` retornado em `products.abacatepay_product_id`.
 *  4. Idempotente — produtos já sincronizados pulam.
 *
 * Rode após:
 *  - Adicionar produto novo no admin
 *  - Trocar de chave AbacatePay (chaves dev e prod têm produtos isolados)
 *  - Migrar de Supabase project (todos os IDs precisam re-sync)
 *
 * Em produção: parte do deploy script ou rodar manual após cadastrar produto.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.ABACATEPAY_API_KEY;

const BASE_URL = "https://api.abacatepay.com/v2";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes em .env.local");
  process.exit(1);
}
if (!API_KEY) {
  console.error("❌ ABACATEPAY_API_KEY ausente em .env.local");
  process.exit(1);
}

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_site_cents: number;
  active: boolean;
  abacatepay_product_id: string | null;
};

async function listPendingProducts(): Promise<Product[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,name,description,price_site_cents,active,abacatepay_product_id&active=eq.true&deleted_at=is.null&abacatepay_product_id=is.null`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Supabase HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as Product[];
}

async function createProduct(p: Product): Promise<{ id: string } | { error: string }> {
  const res = await fetch(`${BASE_URL}/products/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      externalId: p.id,
      name: p.name,
      price: p.price_site_cents,
      currency: "BRL",
      description: p.description?.slice(0, 500) ?? undefined,
    }),
  });
  const body = (await res.json()) as
    | { success: true; data: { id: string } }
    | { success: false; error: string };

  if (!res.ok || !("success" in body) || body.success === false) {
    return { error: "error" in body && typeof body.error === "string" ? body.error : `HTTP ${res.status}` };
  }
  return { id: body.data.id };
}

async function saveAbacatePayId(productId: string, abacatepayId: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ abacatepay_product_id: abacatepayId }),
  });
  if (!res.ok) {
    throw new Error(`Supabase PATCH ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

(async () => {
  console.log("\n🌱 Sync de produtos Veg.ana → AbacatePay\n");
  const pending = await listPendingProducts();

  if (pending.length === 0) {
    console.log("✅ Tudo sincronizado. Nada a fazer.");
    return;
  }

  console.log(`📦 ${pending.length} produto(s) sem abacatepay_product_id. Sincronizando...\n`);

  let ok = 0;
  let failed = 0;

  for (const p of pending) {
    process.stdout.write(`  → ${p.name.slice(0, 40).padEnd(42, " ")}`);
    const result = await createProduct(p);
    if ("error" in result) {
      console.log(`\x1b[31m❌ ${result.error}\x1b[0m`);
      failed += 1;
      continue;
    }
    try {
      await saveAbacatePayId(p.id, result.id);
      console.log(`\x1b[32m✅ ${result.id}\x1b[0m`);
      ok += 1;
    } catch (err) {
      console.log(`\x1b[31m❌ DB save: ${err instanceof Error ? err.message : err}\x1b[0m`);
      failed += 1;
    }
  }

  console.log(`\n📊 ${ok} ok, ${failed} falha(s)\n`);
  if (failed > 0) process.exitCode = 1;
})();

export {};
