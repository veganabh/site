/**
 * Parser do relatório iFood "Itens do cardápio" (xlsx) — ADR 0012, P0.
 *
 * O relatório por produto traz: Posição · Categoria · Nome do item · [Visitas] ·
 * Vendas (qtd) · Total vendas (R$). Detectamos as colunas pelo NOME do cabeçalho
 * (não pela posição) — o iFood às vezes inclui "Visitas", às vezes não.
 *
 * Parse roda só no server (exceljs é node-only). Funções de conversão são puras
 * e testáveis. Valores monetários vêm como "R$ 3.672,00" (com espaço fino) —
 * convertidos pra centavos (inteiro) pra casar com o resto do schema.
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

/**
 * Parseia o buffer do xlsx. Procura a aba cujo cabeçalho tem "Nome do item" +
 * "Vendas" + "Total vendas". O arquivo do iFood tem MAIS de uma aba que casa
 * (ex: "Complementos do cardápio" vem antes e costuma estar vazia), então:
 * prefere a aba chamada "Itens do cardápio"; senão, a que casa com MAIS linhas.
 */
export async function parseIfoodItemsReport(
  buffer: ArrayBuffer | Uint8Array,
): Promise<IfoodItemsParse> {
  const wb = new ExcelJS.Workbook();
  try {
    // Node Buffer e o Buffer do exceljs são ambos Uint8Array — normaliza p/ Buffer.
    const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : Buffer.from(buffer);
    // Cast contorna o skew de tipos Buffer entre @types/node e exceljs.
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  } catch {
    return { ok: false, error: "Não consegui ler o arquivo. Confirme que é um .xlsx do iFood." };
  }

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

  if (candidates.length === 0) {
    return {
      ok: false,
      error:
        'Não achei a planilha de itens. Suba o relatório "Itens do cardápio" do iFood (com as colunas Nome do item, Vendas e Total vendas).',
    };
  }

  // Prefere a aba "Itens do cardápio"; entre as demais, a com mais linhas.
  candidates.sort((a, b) => {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    return b.rows.length - a.rows.length;
  });
  const winner = candidates[0];
  return { ok: true, sheetName: winner.name, rows: winner.rows };
}
