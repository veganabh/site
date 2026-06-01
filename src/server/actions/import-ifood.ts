"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import { parseIfoodReport, type IfoodOrderRow } from "@/lib/ifood-report";
import { bestProductMatch } from "@/lib/ifood-match";

/**
 * Import dos relatórios iFood (ADR 0012). O tipo do arquivo é detectado pelo
 * cabeçalho (parseIfoodReport): "Itens do cardápio" (P0, por produto) ou
 * "relatório de pedidos" (P1, financeiro). Dois passos:
 *  1) parseIfoodReportAction — parseia o xlsx no server, detecta o tipo e
 *     (itens) sugere o casamento de nomes. Devolve preview pro admin conferir.
 *  2) commitIfoodItemsAction / commitIfoodOrdersAction — grava o snapshot.
 *
 * O arquivo nunca é parseado no client (exceljs é node-only). O preview trafega
 * só os dados extraídos, então o commit não re-sobe o arquivo.
 */

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const isCancelled = (status: string): boolean => /cancel/i.test(status);

export type IfoodPreviewRow = {
  ifoodName: string;
  category: string | null;
  qty: number;
  revenueCents: number;
  suggestedProductId: string | null;
  matchSource: "map" | "fuzzy" | "none";
};

export type IfoodProductOption = { id: string; name: string };

export type IfoodOrdersTotals = {
  orders: number;
  totalPaidCents: number;
  feesCents: number;
  netCents: number;
};

export type ParseIfoodResult =
  | { ok: false; error: string }
  | {
      ok: true;
      kind: "items";
      sheetName: string;
      fileName: string;
      rows: IfoodPreviewRow[];
      products: IfoodProductOption[];
      totals: { items: number; qty: number; revenueCents: number };
    }
  | {
      ok: true;
      kind: "orders";
      fileName: string;
      periodStart: string;
      periodEnd: string;
      rows: IfoodOrderRow[];
      totals: IfoodOrdersTotals;
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
  const parsed = await parseIfoodReport(buffer);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // ── Financeiro (por pedido) ────────────────────────────────────────────────
  if (parsed.kind === "orders") {
    const valid = parsed.rows.filter((r) => !isCancelled(r.status));
    const totals = valid.reduce<IfoodOrdersTotals>(
      (acc, r) => ({
        orders: acc.orders + 1,
        totalPaidCents: acc.totalPaidCents + r.totalPaidCents,
        feesCents: acc.feesCents + r.feesCents,
        netCents: acc.netCents + r.netCents,
      }),
      { orders: 0, totalPaidCents: 0, feesCents: 0, netCents: 0 },
    );
    return {
      ok: true,
      kind: "orders",
      fileName: file.name,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rows: parsed.rows,
      totals,
    };
  }

  // ── Itens (por produto) ────────────────────────────────────────────────────
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

  return {
    ok: true,
    kind: "items",
    sheetName: parsed.sheetName,
    fileName: file.name,
    rows,
    products,
    totals,
  };
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

export async function commitIfoodItemsAction(input: unknown): Promise<CommitIfoodResult> {
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

// ── Commit do relatório financeiro (por pedido) — P1 ────────────────────────────

const ordersCommitSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Período inválido."),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Período inválido."),
  fileName: z.string().min(1).max(255),
  rows: z
    .array(
      z.object({
        ifoodOrderId: z.string().min(1),
        orderedAt: z.string().min(1),
        status: z.string(),
        totalPaidCents: z.number().int(),
        feesCents: z.number().int(),
        netCents: z.number().int(),
        paymentMethod: z.string().nullable(),
      }),
    )
    .min(1, "Nada pra importar."),
});

export async function commitIfoodOrdersAction(input: unknown): Promise<CommitIfoodResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, error: authError };

  const parsed = ordersCommitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { periodStart, periodEnd, fileName, rows } = parsed.data;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Idempotência do lote: re-upload do mesmo período substitui o registro de
  // import (os financials são deduplicados por ifood_order_id no upsert abaixo).
  await supabase
    .from("ifood_imports")
    .delete()
    .eq("kind", "orders")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  const totals = rows
    .filter((r) => !isCancelled(r.status))
    .reduce(
      (a, r) => ({
        orders: a.orders + 1,
        totalPaidCents: a.totalPaidCents + r.totalPaidCents,
        feesCents: a.feesCents + r.feesCents,
        netCents: a.netCents + r.netCents,
      }),
      { orders: 0, totalPaidCents: 0, feesCents: 0, netCents: 0 },
    );

  const { data: imp, error: impErr } = await supabase
    .from("ifood_imports")
    .insert({
      kind: "orders",
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

  // Upsert por ifood_order_id — idempotente mesmo com períodos sobrepostos.
  const payload = rows.map((r) => ({
    ifood_order_id: r.ifoodOrderId,
    import_id: imp.id,
    ordered_at: r.orderedAt,
    status: r.status,
    total_paid_cents: r.totalPaidCents,
    fees_cents: r.feesCents,
    net_cents: r.netCents,
    payment_method: r.paymentMethod,
  }));

  const { error: finErr } = await supabase
    .from("ifood_order_financials")
    .upsert(payload, { onConflict: "ifood_order_id" });
  if (finErr) {
    await supabase.from("ifood_imports").delete().eq("id", imp.id);
    return { ok: false, error: "Falha ao gravar o financeiro dos pedidos." };
  }

  revalidatePath("/gestao/relatorios");
  return { ok: true, importedRows: totals.orders };
}
