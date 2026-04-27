/**
 * Seed dos templates de gift kit (com slots e eligible_product_ids).
 *
 * Schema (gift_kit_templates + gift_kit_slots) é criado pela migration 06.
 * Este script popula os 3 kits curados de Veg.ana, resolvendo slugs de
 * produto pra UUIDs reais antes de inserir os slots.
 *
 * Idempotente — UPSERT por slug do template (SELECT-then-INSERT/UPDATE),
 * slots são REPLACE-ALL (DELETE + INSERT).
 *
 * FAIL FAST: se algum slug de produto não resolver pra UUID, aborta antes
 * de tocar no DB — evita slot vazio em prod.
 *
 * Pré-requisitos:
 * - .env.local com NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Migrations 04 (products) + 06 (gift_kits) aplicadas.
 * - `npm run seed:products` rodado antes.
 *
 * Uso:
 *   npm run seed:gift-kits
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/db";
import type { GiftKitIconName } from "../src/lib/kit-icons";

type SeedSlot = {
  label: string;
  helper?: string;
  qty: number;
  /** Slugs de produtos — resolvidos pra UUIDs durante o seed. */
  productSlugs: string[];
};

type SeedTemplate = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  priceIfoodAnchor: number;
  iconName: GiftKitIconName;
  coverPhoto: { url: string; alt: string };
  slots: SeedSlot[];
  active: boolean;
};

// ── Curadoria editorial pre-Supabase ─────────────────────────────────────────
// Inline pra evitar dependência cíclica com mock-gift-kits (que será apagado).

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    slug: "individual",
    name: "Kit Presente Individual",
    tagline: "Pra quem você gosta — e só.",
    description:
      "Um mimo pessoal e afetivo: um bolo no pote fresquinho e dois docinhos pra acompanhar. Perfeito pra mandar pra uma amiga, recepcionar alguém que chegou de viagem ou agradecer aquele favor. Você escolhe os sabores — a gente cuida do resto.",
    price: 31.9,
    priceIfoodAnchor: 42.0,
    iconName: "Heart",
    coverPhoto: {
      url: "/produtos/brownie-pote.png",
      alt: "Kit Presente Individual — 1 bolo no pote + 2 docinhos",
    },
    slots: [
      {
        label: "Escolha o bolo no pote",
        helper: "230g · pronto pra comer sem talher",
        qty: 1,
        productSlugs: [
          "bolo-no-pote-brigadeiro",
          "bolo-no-pote-prestigio",
          "bolo-no-pote-ninho-morango",
          "bolo-no-pote-limao",
          "bolo-no-pote-cenoura",
        ],
      },
      {
        label: "Escolha 2 docinhos",
        helper: "pode repetir o mesmo sabor",
        qty: 2,
        productSlugs: ["bombom-brigadeiro", "beijinho-coco", "brigadeiro-gourmet"],
      },
    ],
    active: true,
  },
  {
    slug: "familia",
    name: "Kit Presente Família",
    tagline: "Um bolo inteiro pra dividir + docinhos pra não sobrar ninguém.",
    description:
      "Feito pra chegar na casa de quem você ama e dar conta da mesa toda. Um bolo inteiro e três docinhos — sabor escolhido por você. Perfeito pra aniversário de longe, chá de bebê ou um domingo em família que você não pôde estar.",
    price: 34.9,
    priceIfoodAnchor: 45.0,
    iconName: "Gift",
    coverPhoto: {
      url: "/produtos/bolo-cenoura-brigadeiro.png",
      alt: "Kit Presente Família — 1 bolo inteiro + 3 docinhos",
    },
    slots: [
      {
        label: "Escolha o bolo",
        helper: "170g · fatia generosa pra dividir",
        qty: 1,
        productSlugs: [
          "bolo-cenoura-cobertura",
          "brownie-chocolate",
          "bolo-formigueiro",
          "bolo-chocolate-molhadinho",
        ],
      },
      {
        label: "Escolha 3 docinhos",
        helper: "pode variar os sabores",
        qty: 3,
        productSlugs: ["bombom-brigadeiro", "beijinho-coco", "brigadeiro-gourmet"],
      },
    ],
    active: true,
  },
  {
    slug: "anfitria",
    name: "Kit Anfitriã",
    tagline: "Recebe bem sem dar trampo. A gente resolve a mesa.",
    description:
      "Pra você que abre a casa pra todo mundo e gosta que ninguém fique de fora — nem a amiga vegana, nem a cunhada intolerante à lactose, nem a criança enjoada. Dois bolos no pote individuais, um bolo inteiro e quatro docinhos, tudo com a curadoria da Veg.ana. Recepção pronta em uma caixa só.",
    price: 74.9,
    priceIfoodAnchor: 99.0,
    iconName: "Users",
    coverPhoto: {
      url: "/produtos/brownie-brigadeiro.png",
      alt: "Kit Anfitriã — 2 bolos no pote + 1 bolo + 4 docinhos",
    },
    slots: [
      {
        label: "Escolha 2 bolos no pote",
        helper: "pode variar os sabores",
        qty: 2,
        productSlugs: [
          "bolo-no-pote-brigadeiro",
          "bolo-no-pote-prestigio",
          "bolo-no-pote-ninho-morango",
          "bolo-no-pote-limao",
          "bolo-no-pote-cenoura",
        ],
      },
      {
        label: "Escolha o bolo pra dividir",
        helper: "170g · serve a mesa",
        qty: 1,
        productSlugs: [
          "bolo-cenoura-cobertura",
          "brownie-chocolate",
          "bolo-formigueiro",
          "bolo-chocolate-molhadinho",
        ],
      },
      {
        label: "Escolha 4 docinhos",
        helper: "pode repetir sabor",
        qty: 4,
        productSlugs: ["bombom-brigadeiro", "beijinho-coco", "brigadeiro-gourmet"],
      },
    ],
    active: true,
  },
];

const reaisToCents = (reais: number): number => Math.round(reais * 100);

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

  // 1. Resolve TODOS os slugs únicos de TODOS os slots → UUIDs.
  //    FAIL FAST se algum não retornar.
  const allSlugs = Array.from(
    new Set(SEED_TEMPLATES.flatMap((t) => t.slots.flatMap((s) => s.productSlugs))),
  );

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, slug")
    .in("slug", allSlugs)
    .is("deleted_at", null);

  if (productsError) {
    throw new Error(`Falha ao buscar produtos: ${productsError.message}`);
  }

  const slugToId = new Map((products ?? []).map((p) => [p.slug, p.id]));
  const missingSlugs = allSlugs.filter((s) => !slugToId.has(s));
  if (missingSlugs.length > 0) {
    throw new Error(
      `FAIL FAST — produtos não encontrados (rode \`npm run seed:products\` antes): ${missingSlugs.join(", ")}`,
    );
  }

  console.log(`→ Seeding ${SEED_TEMPLATES.length} gift kits em ${url}\n`);

  let success = 0;
  let failed = 0;

  for (const seed of SEED_TEMPLATES) {
    // 2. UPSERT do template (SELECT-then-INSERT/UPDATE — slug UNIQUE PARTIAL).
    const { data: existing, error: selectError } = await supabase
      .from("gift_kit_templates")
      .select("id")
      .eq("slug", seed.slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (selectError) {
      console.error(`✗ ${seed.slug} — select: ${selectError.message}`);
      failed++;
      continue;
    }

    const templatePayload = {
      slug: seed.slug,
      name: seed.name,
      tagline: seed.tagline,
      description: seed.description,
      price_cents: reaisToCents(seed.price),
      price_ifood_anchor_cents: reaisToCents(seed.priceIfoodAnchor),
      icon_name: seed.iconName,
      cover_photo_url: seed.coverPhoto.url,
      cover_photo_alt: seed.coverPhoto.alt,
      active: seed.active,
    };

    let templateId: string;
    if (existing) {
      const { error: updateError } = await supabase
        .from("gift_kit_templates")
        .update(templatePayload)
        .eq("id", existing.id);
      if (updateError) {
        console.error(`✗ ${seed.slug} — update template: ${updateError.message}`);
        failed++;
        continue;
      }
      templateId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("gift_kit_templates")
        .insert(templatePayload)
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error(`✗ ${seed.slug} — insert template: ${insertError?.message}`);
        failed++;
        continue;
      }
      templateId = inserted.id;
    }

    // 3. REPLACE-ALL slots.
    const { error: deleteSlotsError } = await supabase
      .from("gift_kit_slots")
      .delete()
      .eq("template_id", templateId);
    if (deleteSlotsError) {
      console.error(`✗ ${seed.slug} — delete slots: ${deleteSlotsError.message}`);
      failed++;
      continue;
    }

    const slotsPayload = seed.slots.map((s, idx) => ({
      template_id: templateId,
      slot_order: idx + 1,
      label: s.label,
      helper: s.helper ?? null,
      qty: s.qty,
      eligible_product_ids: s.productSlugs.map((slug) => slugToId.get(slug)!),
    }));

    const { error: insertSlotsError } = await supabase
      .from("gift_kit_slots")
      .insert(slotsPayload);
    if (insertSlotsError) {
      console.error(`✗ ${seed.slug} — insert slots: ${insertSlotsError.message}`);
      failed++;
      continue;
    }

    console.log(`✓ ${seed.slug} ${existing ? "(updated)" : "(inserted)"} — ${seed.slots.length} slots`);
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
