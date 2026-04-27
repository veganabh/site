/**
 * Seed de pedidos a partir de `src/__fixtures__/orders.ts`.
 *
 * Uso primário: smoke do kanban /gestao em dev/staging com pedidos cobrindo os
 * 6 status da máquina de estado. Em produção, pedidos nascem do checkout real
 * (server action `createOrderAction` futura) — NÃO rodar este seed em prod.
 *
 * Comportamento:
 * - FAIL FAST se algum slug do fixture não existe em `public.products`.
 * - `profile_id = NULL` (D1) — pedidos seed sem user real associado.
 * - Insere `orders` + `order_items` + `order_status_history` em sequência.
 *   O trigger `tg_orders_log_status_transition` registra a transição final;
 *   pra histórico fictício completo (NOVO → ... → status atual), inserimos
 *   manualmente em `order_status_history` após o INSERT.
 * - NÃO idempotente — cada execução cria pedidos novos. Pra resetar, truncar
 *   `orders` (cascade limpa items + history) antes.
 *
 * Pré-requisitos:
 * - .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Migration 09 (orders) aplicada.
 * - `npm run seed:products` rodado antes (resolve slugs em UUIDs).
 *
 * Uso:
 *   npm run seed:orders
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import { orderFixtures } from "../src/__fixtures__/orders";
import { reaisToCents } from "../src/server/supabase/mappers";
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

  // Carrega todos os slugs distintos das fixtures
  const allSlugs = Array.from(
    new Set(orderFixtures.flatMap((o) => o.items.map((i) => i.productSlug))),
  );

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", allSlugs)
    .is("deleted_at", null);

  if (productsError) {
    throw new Error(`Falha ao ler produtos: ${productsError.message}`);
  }

  const slugToId = new Map((products ?? []).map((p) => [p.slug, p.id]));
  const missing = allSlugs.filter((s) => !slugToId.has(s));
  if (missing.length > 0) {
    throw new Error(
      `Slugs não encontrados em public.products (rode seed-products antes?): ${missing.join(", ")}`,
    );
  }

  console.log(`→ Seeding ${orderFixtures.length} pedidos em ${url}\n`);

  let success = 0;
  let failed = 0;

  // Base time pra distribuir as transições de forma plausível
  const now = Date.now();

  for (let idx = 0; idx < orderFixtures.length; idx++) {
    const fixture = orderFixtures[idx];

    // INSERT order — profile_id NULL (D1)
    const { data: orderRow, error: insertError } = await supabase
      .from("orders")
      .insert({
        profile_id: null,
        customer_name: fixture.customerName,
        customer_phone: fixture.customerPhone,
        shipping_address_snapshot: fixture.shippingAddress,
        status: fixture.status,
        payment_status: fixture.paymentStatus,
        source: fixture.source,
        subtotal_cents: reaisToCents(fixture.subtotal),
        shipping_fee_cents: reaisToCents(fixture.shippingFee),
        discount_total_cents: reaisToCents(fixture.discountTotal),
        total_cents: reaisToCents(fixture.total),
        coupon_code: fixture.couponCode ?? null,
        coupon_discount_cents:
          fixture.couponDiscount !== undefined ? reaisToCents(fixture.couponDiscount) : null,
        cancel_reason: fixture.cancelReason ?? null,
      })
      .select("id")
      .single();

    if (insertError || !orderRow) {
      console.error(
        `✗ pedido ${idx + 1} (${fixture.customerName}) — insert: ${insertError?.message ?? "unknown"}`,
      );
      failed++;
      continue;
    }

    const orderId = orderRow.id;

    // INSERT items
    const itemsRows = fixture.items.map((item) => ({
      order_id: orderId,
      is_kit: false,
      product_id: slugToId.get(item.productSlug)!,
      product_name: item.productName,
      product_category: item.productCategory,
      qty: item.qty,
      unit_price_site_cents: reaisToCents(item.unitPriceSite),
      unit_price_ifood_cents: reaisToCents(item.unitPriceIfood),
      notes: item.notes ?? null,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsRows);
    if (itemsError) {
      console.error(`✗ pedido ${idx + 1} — items: ${itemsError.message}`);
      failed++;
      continue;
    }

    // INSERT status_history (sequência completa, datas decrescentes a partir de now)
    // Trigger pode ter inserido 1 entry; substituímos pelo histórico fictício.
    await supabase.from("order_status_history").delete().eq("order_id", orderId);

    const historyRows = fixture.statusSequence.map((status, i) => ({
      order_id: orderId,
      status,
      at: new Date(now - (fixture.statusSequence.length - 1 - i) * 5 * 60 * 1000).toISOString(),
    }));

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert(historyRows);
    if (historyError) {
      console.error(`✗ pedido ${idx + 1} — history: ${historyError.message}`);
      failed++;
      continue;
    }

    console.log(`✓ ${fixture.customerName} — ${fixture.status} (${orderId.slice(0, 8)})`);
    success++;
  }

  console.log(`\nResultado: ${success} ok · ${failed} erros.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
