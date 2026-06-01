/**
 * Parser dos relatórios iFood (xlsx) — ADR 0012.
 *
 * Dois relatórios, detectados pelo cabeçalho (`parseIfoodReport`):
 * - **Itens do cardápio** (P0, por produto): Posição · Categoria · Nome do item ·
 *   [Visitas] · Vendas (qtd) · Total vendas (R$). Colunas achadas pelo NOME do
 *   cabeçalho (o iFood às vezes inclui "Visitas", às vezes não).
 * - **relatório de pedidos** (P1, financeiro por pedido): ID do pedido · data ·
 *   status · total pago · taxas e comissões · valor líquido · forma de pagamento.
 *
 * Parse roda só no server (exceljs é node-only). Funções de conversão são puras
 * e testáveis. Dinheiro vem como "R$ 3.672,00" (com espaço fino) OU número cru —
 * convertido pra centavos (inteiro) pra casar com o resto do schema.
 */

import ExcelJS from "exceljs";

export type IfoodItemRow = {
  ifoodName: string;
  category: string | null;
  qty: number;
  revenueCents: number;
};

export type IfoodItemsParse =
  | { ok: true; sheetName: string; rows: IfoodItemRow[] }
  | { ok: false; error: string };

/** Marcas diacríticas combinantes (U+0300–U+036F) — removidas após NFD. */
const STRIP_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza cabeçalho: sem acento, minúsculo, sem espaço nas pontas. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(STRIP_DIACRITICS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * "R$ 3.672,00" / "R$ 1.176,00" / 8.5 / "" → centavos (inteiro) ou null.
 * Formato BR: "." separa milhar, "," separa decimal.
 */
export function parseMoneyToCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }
  const raw = String(value).replace(/ /g, " ").replace(/r\$/gi, "").replace(/\s/g, "").trim();
  if (raw === "") return null;
  // Remove separador de milhar (.) e troca decimal (,) por ponto.
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** "459" / 459 / "" → inteiro >= 0 ou null. */
export function parseIntCell(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const raw = String(value).replace(/\s/g, "").replace(/\./g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const REQUIRED = { name: "nome do item", qty: "vendas", revenue: "total vendas" } as const;

type ColIndex = { name: number; category: number | null; qty: number; revenue: number };

/** Acha as colunas pela linha de cabeçalho. null se não for a planilha de itens. */
function resolveColumns(headerRow: ExcelJS.Row): ColIndex | null {
  const map = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const h = normalizeHeader(cell.value);
    if (h && !map.has(h)) map.set(h, col);
  });
  const name = map.get(REQUIRED.name);
  const qty = map.get(REQUIRED.qty);
  const revenue = map.get(REQUIRED.revenue);
  if (name === undefined || qty === undefined || revenue === undefined) return null;
  return { name, qty, revenue, category: map.get("categoria") ?? null };
}

/** Lê as linhas de produto de uma aba já validada. Consolida nomes repetidos. */
function readRows(ws: ExcelJS.Worksheet, cols: ColIndex): IfoodItemRow[] {
  const rows: IfoodItemRow[] = [];
  const seen = new Map<string, number>(); // nome -> índice em rows
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const ifoodName = String(row.getCell(cols.name).value ?? "").trim();
    if (!ifoodName) return;
    const qty = parseIntCell(row.getCell(cols.qty).value) ?? 0;
    const revenueCents = parseMoneyToCents(row.getCell(cols.revenue).value) ?? 0;
    const category =
      cols.category !== null ? String(row.getCell(cols.category).value ?? "").trim() || null : null;

    const prevIdx = seen.get(ifoodName);
    if (prevIdx !== undefined) {
      rows[prevIdx].qty += qty;
      rows[prevIdx].revenueCents += revenueCents;
      return;
    }
    seen.set(ifoodName, rows.length);
    rows.push({ ifoodName, category, qty, revenueCents });
  });
  return rows;
}

/** Carrega o workbook do buffer (uma vez). null se não for xlsx válido. */
async function loadWorkbook(buffer: ArrayBuffer | Uint8Array): Promise<ExcelJS.Workbook | null> {
  const wb = new ExcelJS.Workbook();
  try {
    // Node Buffer e o Buffer do exceljs são ambos Uint8Array — normaliza p/ Buffer.
    const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer);
    // Cast contorna o skew de tipos Buffer entre @types/node e exceljs.
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
    return wb;
  } catch {
    return null;
  }
}

/**
 * Escolhe a aba de itens e lê as linhas. O arquivo do iFood tem MAIS de uma aba
 * que casa (ex: "Complementos do cardápio" vem antes e costuma estar vazia):
 * prefere a aba "Itens do cardápio"; senão, a que casa com MAIS linhas.
 */
function selectItems(wb: ExcelJS.Workbook): { sheetName: string; rows: IfoodItemRow[] } | null {
  const candidates: { name: string; rows: IfoodItemRow[]; preferred: boolean }[] = [];
  for (const ws of wb.worksheets) {
    const cols = resolveColumns(ws.getRow(1));
    if (!cols) continue;
    candidates.push({
      name: ws.name,
      rows: readRows(ws, cols),
      preferred: normalizeHeader(ws.name) === "itens do cardapio",
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    return b.rows.length - a.rows.length;
  });
  const winner = candidates[0];
  return { sheetName: winner.name, rows: winner.rows };
}

const ITEMS_NOT_FOUND =
  'Não achei a planilha de itens. Suba o relatório "Itens do cardápio" do iFood (com as colunas Nome do item, Vendas e Total vendas).';

export async function parseIfoodItemsReport(
  buffer: ArrayBuffer | Uint8Array,
): Promise<IfoodItemsParse> {
  const wb = await loadWorkbook(buffer);
  if (!wb) {
    return { ok: false, error: "Não consegui ler o arquivo. Confirme que é um .xlsx do iFood." };
  }
  const sel = selectItems(wb);
  if (!sel) return { ok: false, error: ITEMS_NOT_FOUND };
  return { ok: true, sheetName: sel.sheetName, rows: sel.rows };
}

// ── Relatório financeiro por pedido ("relatorio-pedidos") — P1 ──────────────────

export type IfoodOrderRow = {
  ifoodOrderId: string;
  /** ISO. */
  orderedAt: string;
  status: string;
  totalPaidCents: number;
  /** módulo (o relatório traz a comissão como negativo). */
  feesCents: number;
  netCents: number;
  paymentMethod: string | null;
};

export type IfoodOrdersParse =
  | { ok: true; rows: IfoodOrderRow[]; periodStart: string; periodEnd: string }
  | { ok: false; error: string };

/** "28/02/2026 21:40:24" ou Date → ISO. Constrói em UTC pra a data não escorregar. */
export function parseDateBR(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const s = String(value ?? "").trim();
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mo, y, h = "0", min = "0", sec = "0"] = m;
  const dt = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min), Number(sec)),
  );
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

type OrderColIndex = {
  id: number;
  date: number;
  status: number | null;
  total: number;
  fees: number | null;
  net: number;
  payment: number | null;
};

/** Acha as colunas do relatório financeiro por substring do cabeçalho. */
function resolveOrderColumns(headerRow: ExcelJS.Row): OrderColIndex | null {
  const map = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const h = normalizeHeader(cell.value);
    if (h && !map.has(h)) map.set(h, col);
  });
  const find = (sub: string): number | null => {
    for (const [h, col] of map) if (h.includes(sub)) return col;
    return null;
  };
  const id = find("id completo do pedido");
  const date = find("data e hora");
  const total = find("total pago");
  const net = find("valor liquido");
  if (id === null || date === null || total === null || net === null) return null;
  return {
    id,
    date,
    total,
    net,
    status: find("status final"),
    fees: find("taxas e comiss"),
    payment: find("forma de pagamento"),
  };
}

function selectOrders(wb: ExcelJS.Workbook): IfoodOrderRow[] | null {
  for (const ws of wb.worksheets) {
    const cols = resolveOrderColumns(ws.getRow(1));
    if (!cols) continue;
    const rows: IfoodOrderRow[] = [];
    const seen = new Set<string>();
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const ifoodOrderId = String(row.getCell(cols.id).value ?? "").trim();
      if (!ifoodOrderId || seen.has(ifoodOrderId)) return;
      const orderedAt = parseDateBR(row.getCell(cols.date).value);
      if (!orderedAt) return;
      seen.add(ifoodOrderId);
      rows.push({
        ifoodOrderId,
        orderedAt,
        status: cols.status !== null ? String(row.getCell(cols.status).value ?? "").trim() : "",
        totalPaidCents: parseMoneyToCents(row.getCell(cols.total).value) ?? 0,
        feesCents:
          cols.fees !== null ? Math.abs(parseMoneyToCents(row.getCell(cols.fees).value) ?? 0) : 0,
        netCents: parseMoneyToCents(row.getCell(cols.net).value) ?? 0,
        paymentMethod:
          cols.payment !== null
            ? String(row.getCell(cols.payment).value ?? "").trim() || null
            : null,
      });
    });
    return rows;
  }
  return null;
}

export async function parseIfoodOrdersReport(
  buffer: ArrayBuffer | Uint8Array,
): Promise<IfoodOrdersParse> {
  const wb = await loadWorkbook(buffer);
  if (!wb) {
    return { ok: false, error: "Não consegui ler o arquivo. Confirme que é um .xlsx do iFood." };
  }
  const rows = selectOrders(wb);
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      error:
        'Não achei pedidos no arquivo. Suba o "relatório de pedidos" do iFood (financeiro), com ID do pedido, total pago e valor líquido.',
    };
  }
  const dates = rows.map((r) => r.orderedAt).sort();
  return {
    ok: true,
    rows,
    periodStart: dates[0].slice(0, 10),
    periodEnd: dates[dates.length - 1].slice(0, 10),
  };
}

// ── Entrada unificada: detecta o tipo do relatório e parseia ────────────────────

export type IfoodReportParse =
  | { ok: true; kind: "items"; sheetName: string; rows: IfoodItemRow[] }
  | { ok: true; kind: "orders"; rows: IfoodOrderRow[]; periodStart: string; periodEnd: string }
  | { ok: false; error: string };

/**
 * Detecta pelo cabeçalho se é o relatório financeiro (por pedido) ou de itens
 * (por produto) e parseia. Tenta pedidos primeiro (cabeçalho mais específico).
 */
export async function parseIfoodReport(
  buffer: ArrayBuffer | Uint8Array,
): Promise<IfoodReportParse> {
  const wb = await loadWorkbook(buffer);
  if (!wb) {
    return { ok: false, error: "Não consegui ler o arquivo. Confirme que é um .xlsx do iFood." };
  }

  const orderRows = selectOrders(wb);
  if (orderRows && orderRows.length > 0) {
    const dates = orderRows.map((r) => r.orderedAt).sort();
    return {
      ok: true,
      kind: "orders",
      rows: orderRows,
      periodStart: dates[0].slice(0, 10),
      periodEnd: dates[dates.length - 1].slice(0, 10),
    };
  }

  const items = selectItems(wb);
  if (items && items.rows.length > 0) {
    return { ok: true, kind: "items", sheetName: items.sheetName, rows: items.rows };
  }

  return {
    ok: false,
    error:
      "Não reconheci o relatório. Suba o de itens (Itens do cardápio) ou o financeiro (relatório de pedidos) do iFood.",
  };
}
