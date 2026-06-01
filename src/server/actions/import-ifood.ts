"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import { parseIfoodItemsReport } from "@/lib/ifood-report";
import { bestProductMatch } from "@/lib/ifood-match";

/**
 * Import do relatório iFood "Itens do cardápio" (ADR 0012, P0). Dois passos:
 *  1) parseIfoodReportAction — parseia o xlsx no server + sugere o casamento de
 *     nomes (mapa salvo > aproximado). Devolve preview pro admin conferir.
 *  2) commitIfoodImportAction — grava o snapshot do período (substitui o
 *     anterior) + persiste o mapeamento confirmado.
 *
 * O arquivo nunca é parseado no client (exceljs é node-only). O preview trafega
 * só os dados extraídos (poucas linhas), então o commit não re-sobe o arquivo.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type IfoodPreviewRow = {
  ifoodName: string;
  category: string | null;
  qty: number;
  revenueCents: number;
  suggestedProductId: string | null;
  matchSource: "map" | "fuzzy" | "none";
};

export type IfoodProductOption = { id: string; name: string };

export type ParseIfoodResult =
  | { ok: false; error: string }
  | {
      ok: true;
      sheetName: string;
      fileName: string;
      rows: IfoodPreviewRow[];
      products: IfoodProductOption[];
      totals: { items: number; qty: number; revenueCents: number };
    };

export async function parseIfoodReportAction(formData: FormData): Promise<ParseIfoodResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione o arquivo .xlsx do iFood." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "Arquivo muito grande (máx 5 MB)." };
  }

  const buffer = await file.arrayBuffer();
  const parsed = await parseIfoodItemsReport(buffer);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.rows.length === 0) {
    return { ok: false, error: "A planilha de itens está vazia." };
  }

  const { data: prodData } = await supabase
    .from("products")
    .select("id, name")
    .is("deleted_at", null);
  const products: IfoodProductOption[] = (prodData ?? []).map((p) => ({ id: p.id, name: p.name }));

  const { data: mapData } = await supabase
    .from("ifood_product_map")
    .select("ifood_name, product_id");
  const savedMap = new Map((mapData ?? []).map((m) => [m.ifood_name, m.product_id]));
  const validIds = new Set(products.map((p) => p.id));

  const rows: IfoodPreviewRow[] = parsed.rows.map((r) => {
    const saved = savedMap.get(r.ifoodName);
    if (saved && validIds.has(saved)) {
      return { ...r, suggestedProductId: saved, matchSource: "map" as const };
    }
    const m = bestProductMatch(r.ifoodName, products);
    return {
      ...r,
      suggestedProductId: m?.id ?? null,
      matchSource: m ? ("fuzzy" as const) : ("none" as const),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      items: acc.items + 1,
      qty: acc.qty + r.qty,
      revenueCents: acc.revenueCents + r.revenueCents,
    }),
    { items: 0, qty: 0, revenueCents: 0 },
  );

  return { ok: true, sheetName: parsed.sheetName, fileName: file.name, rows, products, totals };
}

const commitSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida."),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida."),
  fileName: z.string().min(1).max(255),
  rows: z
    .array(
      z.object({
        ifoodName: z.string().min(1),
        category: z.string().nullable(),
        qty: z.number().int().min(0),
        revenueCents: z.number().int().min(0),
        productId: z.string().uuid().nullable(),
      }),
    )
    .min(1, "Nada pra importar."),
});

export type CommitIfoodResult = {
  ok: boolean;
  error?: string;
  importedRows?: number;
  mappedCount?: number;
};

export async function commitIfoodImportAction(input: unknown): Promise<CommitIfoodResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { periodStart, periodEnd, fileName, rows } = parsed.data;
  if (periodEnd < periodStart) {
    return { ok: false, error: "A data final é anterior à inicial." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Idempotência: re-upload do mesmo período substitui (cascade apaga as vendas).
  await supabase
    .from("ifood_imports")
    .delete()
    .eq("kind", "items")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  const totals = rows.reduce(
    (a, r) => ({ qty: a.qty + r.qty, revenueCents: a.revenueCents + r.revenueCents }),
    { qty: 0, revenueCents: 0 },
  );

  const { data: imp, error: impErr } = await supabase
    .from("ifood_imports")
    .insert({
      kind: "items",
      period_start: periodStart,
      period_end: periodEnd,
      file_name: fileName,
      row_count: rows.length,
      totals,
      imported_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (impErr || !imp) {
    return { ok: false, error: "Não consegui registrar o import. Tente de novo." };
  }

  const salesPayload = rows.map((r) => ({
    import_id: imp.id,
    ifood_item_name: r.ifoodName,
    product_id: r.productId,
    qty: r.qty,
    revenue_cents: r.revenueCents,
    period_start: periodStart,
    period_end: periodEnd,
  }));

  const { error: salesErr } = await supabase.from("ifood_product_sales").insert(salesPayload);
  if (salesErr) {
    // Não deixa lote órfão se as vendas falharem.
    await supabase.from("ifood_imports").delete().eq("id", imp.id);
    return { ok: false, error: "Falha ao gravar as vendas do período." };
  }

  // Persiste o casamento confirmado → próximo import casa sozinho.
  const mapPayload = rows
    .filter((r) => r.productId)
    .map((r) => ({
      ifood_name: r.ifoodName,
      product_id: r.productId,
      updated_at: new Date().toISOString(),
    }));
  let mappedCount = 0;
  if (mapPayload.length > 0) {
    const { error: mapErr } = await supabase
      .from("ifood_product_map")
      .upsert(mapPayload, { onConflict: "ifood_name" });
    if (!mapErr) mappedCount = mapPayload.length;
  }

  revalidatePath("/gestao/relatorios");
  return { ok: true, importedRows: rows.length, mappedCount };
}
