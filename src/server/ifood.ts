import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { buildIfoodTiming, type IfoodTiming } from "@/lib/ifood-timing";

/**
 * Leitura do snapshot iFood importado (ADR 0012) pros Relatórios. Agrega
 * `ifood_product_sales` por produto + por mês, filtrando pelo período do
 * relatório (intersecção com [start, end] em ms; null = tudo).
 *
 * Valores em REAIS (converte de centavos na borda, como o resto do domínio).
 */

export type IfoodProductAgg = {
  /** null = nome do iFood ainda não casado com produto do catálogo. */
  productId: string | null;
  ifoodName: string;
  units: number;
  revenue: number;
};

export type IfoodMonthRevenue = { month: string; revenue: number };

export type IfoodImportInfo = {
  kind: string;
  periodStart: string;
  periodEnd: string;
  fileName: string;
  importedAt: string;
  rowCount: number;
};

export type IfoodSnapshot = {
  hasData: boolean;
  byProduct: IfoodProductAgg[];
  totalUnits: number;
  totalRevenue: number;
  byMonth: IfoodMonthRevenue[];
  imports: IfoodImportInfo[];
};

const centsToReais = (cents: number): number => Math.round(cents) / 100;

function emptySnapshot(): IfoodSnapshot {
  return {
    hasData: false,
    byProduct: [],
    totalUnits: 0,
    totalRevenue: 0,
    byMonth: [],
    imports: [],
  };
}

export async function getIfoodSnapshot(range?: {
  start: number | null;
  end: number | null;
}): Promise<IfoodSnapshot> {
  const supabase = await createSupabaseServerClient();

  const { data: sales, error } = await supabase
    .from("ifood_product_sales")
    .select("product_id, ifood_item_name, qty, revenue_cents, period_start, period_end");

  if (error) {
    console.error("[server/ifood] sales:", error.message);
    return emptySnapshot();
  }

  const start = range?.start ?? null;
  const end = range?.end ?? null;
  const inRange = (ps: string, pe: string): boolean => {
    const psMs = new Date(`${ps}T00:00:00`).getTime();
    const peMs = new Date(`${pe}T23:59:59`).getTime();
    if (start !== null && peMs < start) return false;
    if (end !== null && psMs > end) return false;
    return true;
  };

  const rows = (sales ?? []).filter((s) => inRange(s.period_start, s.period_end));

  const byKey = new Map<string, IfoodProductAgg>();
  const byMonth = new Map<string, number>();
  let totalUnits = 0;
  let totalRevenue = 0;

  for (const s of rows) {
    const revenue = centsToReais(s.revenue_cents);
    const key = s.product_id ?? `name:${s.ifood_item_name}`;
    const agg = byKey.get(key) ?? {
      productId: s.product_id,
      ifoodName: s.ifood_item_name,
      units: 0,
      revenue: 0,
    };
    agg.units += s.qty;
    agg.revenue += revenue;
    byKey.set(key, agg);

    totalUnits += s.qty;
    totalRevenue += revenue;
    const month = s.period_start.slice(0, 7); // YYYY-MM
    byMonth.set(month, (byMonth.get(month) ?? 0) + revenue);
  }

  const { data: imports } = await supabase
    .from("ifood_imports")
    .select("kind, period_start, period_end, file_name, imported_at, row_count")
    .order("period_start", { ascending: false });

  return {
    hasData: rows.length > 0,
    byProduct: [...byKey.values()].sort((a, b) => b.revenue - a.revenue),
    totalUnits,
    totalRevenue,
    byMonth: [...byMonth.entries()]
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    imports: (imports ?? []).map((i) => ({
      kind: i.kind,
      periodStart: i.period_start,
      periodEnd: i.period_end,
      fileName: i.file_name,
      importedAt: i.imported_at,
      rowCount: i.row_count,
    })),
  };
}

// ── Financeiro por pedido (relatorio-pedidos) — P1 ──────────────────────────────

export type IfoodFinancials = {
  hasData: boolean;
  /** pedidos não cancelados no período. */
  orders: number;
  /** TOTAL PAGO PELO CLIENTE (comparável ao total de um pedido do site). */
  revenue: number;
  /** VALOR LIQUIDO — líquido real recebido (pode passar a receita via incentivo). */
  net: number;
  /** TAXAS E COMISSOES (módulo). */
  fees: number;
  avgTicket: number;
  /** taxa efetiva real = fees / revenue (0..1). null se sem receita. */
  effectiveRate: number | null;
  byMonth: IfoodMonthRevenue[];
  /** Pico de pedidos + mix de pagamento (P2) — derivado do ordered_at. */
  timing: IfoodTiming;
};

function emptyFinancials(): IfoodFinancials {
  return {
    hasData: false,
    orders: 0,
    revenue: 0,
    net: 0,
    fees: 0,
    avgTicket: 0,
    effectiveRate: null,
    byMonth: [],
    timing: buildIfoodTiming([]),
  };
}

export async function getIfoodFinancials(range?: {
  start: number | null;
  end: number | null;
}): Promise<IfoodFinancials> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ifood_order_financials")
    .select("ordered_at, status, total_paid_cents, fees_cents, net_cents, payment_method");

  if (error) {
    console.error("[server/ifood] financials:", error.message);
    return emptyFinancials();
  }

  const start = range?.start ?? null;
  const end = range?.end ?? null;
  const rows = (data ?? []).filter((r) => {
    if (/cancel/i.test(r.status)) return false;
    const t = new Date(r.ordered_at).getTime();
    if (start !== null && t < start) return false;
    if (end !== null && t > end) return false;
    return true;
  });

  if (rows.length === 0) return emptyFinancials();

  const byMonth = new Map<string, number>();
  let revenueCents = 0;
  let netCents = 0;
  let feesCents = 0;
  for (const r of rows) {
    revenueCents += r.total_paid_cents;
    netCents += r.net_cents;
    feesCents += r.fees_cents;
    const month = r.ordered_at.slice(0, 7); // YYYY-MM
    byMonth.set(month, (byMonth.get(month) ?? 0) + r.total_paid_cents);
  }

  const revenue = centsToReais(revenueCents);
  const timing = buildIfoodTiming(
    rows.map((r) => ({ orderedAt: r.ordered_at, paymentMethod: r.payment_method })),
  );
  return {
    hasData: true,
    orders: rows.length,
    revenue,
    net: centsToReais(netCents),
    fees: centsToReais(feesCents),
    avgTicket: rows.length > 0 ? revenue / rows.length : 0,
    effectiveRate: revenueCents > 0 ? feesCents / revenueCents : null,
    byMonth: [...byMonth.entries()]
      .map(([month, cents]) => ({ month, revenue: centsToReais(cents) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    timing,
  };
}
