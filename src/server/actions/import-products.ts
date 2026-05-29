"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth/require-admin";
import { parseProductCsv, toSlug, type ParsedProductRow } from "@/lib/product-csv";

/**
 * Import de produtos via CSV. Recebe o texto cru do arquivo, re-parseia com
 * `parseProductCsv` (server é a fonte de verdade — não confia no preview do
 * client), resolve/cria categorias e faz upsert por slug.
 *
 * Decisões aprovadas: preco_site vazio copia o iFood; upsert por slug;
 * categoria inexistente é criada no import.
 */

export type ImportProductsResult = {
  ok: boolean;
  /** Erro que aborta tudo (auth, cabeçalho, arquivo vazio). */
  fatal?: string;
  created: number;
  updated: number;
  /** Nomes de categorias criadas durante o import. */
  categoriesCreated: string[];
  /** Linhas que falharam (validação ou gravação), 1-based incluindo cabeçalho. */
  errors: { line: number; messages: string[] }[];
};

const reaisToCents = (reais: number): number => Math.round(reais * 100);

export async function importProductsAction(csvText: string): Promise<ImportProductsResult> {
  const empty: ImportProductsResult = {
    ok: false,
    created: 0,
    updated: 0,
    categoriesCreated: [],
    errors: [],
  };

  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return { ...empty, fatal: "Arquivo vazio ou inválido." };
  }

  const parsed = parseProductCsv(csvText);
  if (parsed.fatal) return { ...empty, fatal: parsed.fatal };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ...empty, fatal: authError };

  const errors: { line: number; messages: string[] }[] = [];
  const okRows: { line: number; data: ParsedProductRow }[] = [];

  // Erros de validação do parse + detecção de slug duplicado no próprio arquivo.
  const seenSlugs = new Map<string, number>();
  for (const row of parsed.rows) {
    if (!row.ok) {
      errors.push({ line: row.line, messages: row.errors });
      continue;
    }
    const slug = toSlug(row.data.nome);
    const prevLine = seenSlugs.get(slug);
    if (prevLine) {
      errors.push({
        line: row.line,
        messages: [`nome gera o mesmo identificador "${slug}" da linha ${prevLine}. Remova a duplicata.`],
      });
      continue;
    }
    seenSlugs.set(slug, row.line);
    okRows.push({ line: row.line, data: row.data });
  }

  if (okRows.length === 0) {
    return { ...empty, ok: errors.length === 0, errors };
  }

  // ── Resolve categorias (cria as que faltam) ──────────────────────────────────
  const { data: existingCats, error: catErr } = await supabase
    .from("categories")
    .select("slug, sort_order");
  if (catErr) {
    return { ...empty, fatal: "Não consegui ler as categorias. Tente de novo.", errors };
  }

  const catSlugs = new Set((existingCats ?? []).map((c) => c.slug));
  let nextOrder =
    (existingCats ?? []).reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0) + 1;
  const categoriesCreated: string[] = [];

  // nomes distintos (preservando o nome legível original p/ criar)
  const distinctCats = new Map<string, string>(); // slug -> nome
  for (const { data } of okRows) {
    const slug = toSlug(data.categoriaNome);
    if (!distinctCats.has(slug)) distinctCats.set(slug, data.categoriaNome);
  }

  for (const [slug, nome] of distinctCats) {
    if (catSlugs.has(slug)) continue;
    const { error } = await supabase
      .from("categories")
      .insert({ slug, name: nome, sort_order: nextOrder });
    if (error) {
      // 23505 = corrida/duplicado: já existe, segue.
      if (error.code !== "23505") {
        return { ...empty, fatal: `Falha ao criar categoria "${nome}".`, errors };
      }
    } else {
      categoriesCreated.push(nome);
    }
    catSlugs.add(slug);
    nextOrder++;
  }

  // ── Upsert produtos por slug ─────────────────────────────────────────────────
  let created = 0;
  let updated = 0;

  for (const { line, data } of okRows) {
    const slug = toSlug(data.nome);
    const categorySlug = toSlug(data.categoriaNome);

    const payload = {
      slug,
      name: data.nome,
      description: data.descricao,
      category: categorySlug,
      gramatura_g: data.pesoG,
      price_site_cents: reaisToCents(data.precoSite),
      price_ifood_cents: reaisToCents(data.precoIfood),
      cost_cents: reaisToCents(data.custo),
      attributes: data.attributes,
      tags: data.tags,
      contains: data.contains,
      serves: data.serveAte ?? null,
      active: data.ativo,
      stock: data.estoque,
      low_stock_threshold: data.alertaEstoque,
    };

    // slug tem índice UNIQUE PARCIAL (WHERE deleted_at IS NULL) — upsert nativo
    // não cobre. SELECT-then-INSERT/UPDATE manual.
    const { data: existing, error: selErr } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (selErr) {
      errors.push({ line, messages: [`Falha ao checar duplicata: ${selErr.message}`] });
      continue;
    }

    if (existing) {
      const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
      if (error) errors.push({ line, messages: [`Falha ao atualizar: ${error.message}`] });
      else updated++;
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, photo_url: "", photo_alt: data.nome });
      if (error) errors.push({ line, messages: [`Falha ao criar: ${error.message}`] });
      else created++;
    }
  }

  revalidatePath("/", "layout");

  return {
    ok: created + updated > 0,
    created,
    updated,
    categoriesCreated,
    errors,
  };
}
