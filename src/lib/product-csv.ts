/**
 * Import de produtos via CSV — parsing + validação puros (sem "use server"/
 * "use client"), compartilhados entre o preview no client e a gravação no server.
 *
 * Fluxo: cliente baixa o template, preenche (Excel/Sheets pt-BR), faz upload.
 * O texto cru vai pro server action, que re-parseia com este mesmo módulo
 * (server é a fonte de verdade) e grava. O client usa o parse só pro preview.
 *
 * Decisões (aprovadas):
 * - preco_site vazio → copia preco_ifood.
 * - upsert por slug (atualiza se já existe).
 * - categoria inexistente é criada no import.
 */

import {
  PRODUCT_CONTAINS,
  PRODUCT_TAGS,
  type ProductAttribute,
  type ProductContains,
  type ProductTag,
} from "@/types/product";

// ── Colunas do template ────────────────────────────────────────────────────────

/** Ordem e cabeçalho do CSV. A 1ª linha do arquivo deve bater com estes nomes. */
export const CSV_COLUMNS = [
  "nome",
  "descricao",
  "categoria",
  "preco_site",
  "preco_ifood",
  "custo",
  "peso_g",
  "serve_ate",
  "estoque",
  "alerta_estoque",
  "vegano",
  "sem_lactose",
  "sem_gluten",
  "sem_ovo",
  "contem",
  "tags",
  "ativo",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Linha de exemplo no template (o "Bolo no Pote de Brigadeiro" real). */
const EXAMPLE_ROW: Record<CsvColumn, string> = {
  nome: "Bolo no Pote de Brigadeiro",
  descricao:
    "Bolo de chocolate (farinha de trigo, açúcar, cacau, óleo, melado de cana) com recheio de brigadeiro de castanha de caju.",
  categoria: "Delícias no Pote",
  preco_site: "21,90",
  preco_ifood: "21,90",
  custo: "8,50",
  peso_g: "180",
  serve_ate: "1",
  estoque: "5",
  alerta_estoque: "3",
  vegano: "sim",
  sem_lactose: "sim",
  sem_gluten: "",
  sem_ovo: "sim",
  contem: "castanha-de-caju;trigo;cacau",
  tags: "favoritos",
  ativo: "sim",
};

/**
 * Gera o conteúdo do template CSV (cabeçalho + 1 linha de exemplo).
 * Delimitador `;` — padrão do Excel pt-BR e evita conflito com vírgula decimal.
 */
export function buildTemplateCsv(): string {
  const header = CSV_COLUMNS.join(";");
  const example = CSV_COLUMNS.map((c) => csvEscape(EXAMPLE_ROW[c])).join(";");
  // BOM pra o Excel abrir acentos certos.
  return `﻿${header}\r\n${example}\r\n`;
}

function csvEscape(value: string): string {
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Parser ──────────────────────────────────────────────────────────────────

/** Detecta delimitador (`;` ou `,`) pela 1ª linha não vazia. */
function detectDelimiter(text: string): ";" | "," {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

/**
 * Parser CSV mínimo com suporte a campos entre aspas (que podem conter o
 * delimitador, aspas escapadas `""` e quebras de linha). Retorna matriz de
 * strings já sem o BOM.
 */
export function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // ignora — \n cuida da quebra
    } else {
      field += char;
    }
  }
  // última célula/linha (se o arquivo não termina em \n)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// ── Conversores de célula ────────────────────────────────────────────────────

/** "21,90" | "1.234,56" | "21.90" → number (NaN se inválido). */
export function parseNumberCell(value: string): number {
  const v = value.trim();
  if (!v) return NaN;
  let normalized = v;
  if (v.includes(",") && v.includes(".")) {
    // "." é separador de milhar, "," é decimal
    normalized = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",")) {
    normalized = v.replace(",", ".");
  }
  return Number(normalized);
}

const TRUTHY = new Set(["sim", "s", "x", "true", "1", "verdadeiro", "v"]);
const FALSY = new Set(["nao", "não", "n", "false", "0", "f"]);

/** Booleano tolerante. `emptyDefault` decide o vazio. */
export function parseBoolCell(value: string, emptyDefault = false): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return emptyDefault;
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return emptyDefault;
}

/** Split de lista por `;` (ou `,` se não houver `;`), normalizando p/ slug-like. */
function parseListCell(value: string): string[] {
  const v = value.trim();
  if (!v) return [];
  const sep = v.includes(";") ? ";" : ",";
  return v
    .split(sep)
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, "-"),
    )
    .filter(Boolean);
}

// ── Tipo de saída + validação ────────────────────────────────────────────────

/** Produto pronto pra gravar (já em reais, categoria como nome legível). */
export type ParsedProductRow = {
  nome: string;
  descricao: string;
  categoriaNome: string;
  precoSite: number;
  precoIfood: number;
  custo: number;
  pesoG: number;
  serveAte?: number;
  estoque: number;
  alertaEstoque: number;
  attributes: ProductAttribute[];
  contains: ProductContains[];
  tags: ProductTag[];
  ativo: boolean;
};

export type RowResult =
  | { line: number; ok: true; data: ParsedProductRow }
  | { line: number; ok: false; errors: string[] };

export type ParsedCsv = {
  /** Erro estrutural (cabeçalho inválido, arquivo vazio). Para tudo. */
  fatal?: string;
  rows: RowResult[];
};

/**
 * Parseia + valida o CSV inteiro. Não toca em DB — só transforma e checa.
 * O server action depois resolve categorias e grava.
 */
export function parseProductCsv(raw: string): ParsedCsv {
  const matrix = parseCsv(raw);
  if (matrix.length === 0) return { fatal: "Arquivo vazio.", rows: [] };

  const header = matrix[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    return {
      fatal: `Cabeçalho inválido. Faltam as colunas: ${missing.join(", ")}. Baixe o modelo e use os mesmos nomes.`,
      rows: [],
    };
  }

  const idx = (col: CsvColumn) => header.indexOf(col);
  const rows: RowResult[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const get = (col: CsvColumn) => (cells[idx(col)] ?? "").trim();
    const errors: string[] = [];
    const line = r + 1; // 1-based, contando o cabeçalho

    const nome = get("nome");
    if (nome.length < 2) errors.push("nome: mínimo 2 caracteres.");
    if (nome.length > 120) errors.push("nome: máximo 120 caracteres.");

    const descricao = get("descricao");
    if (descricao.length < 10) errors.push("descricao: mínimo 10 caracteres.");
    if (descricao.length > 2000) errors.push("descricao: máximo 2000 caracteres.");

    const categoriaNome = get("categoria");
    if (categoriaNome.length < 2) errors.push("categoria: obrigatória.");

    const precoIfood = parseNumberCell(get("preco_ifood"));
    if (!Number.isFinite(precoIfood) || precoIfood <= 0)
      errors.push("preco_ifood: número maior que 0 (ex: 21,90).");

    const precoSiteRaw = get("preco_site");
    const precoSite = precoSiteRaw ? parseNumberCell(precoSiteRaw) : precoIfood;
    if (precoSiteRaw && (!Number.isFinite(precoSite) || precoSite <= 0))
      errors.push("preco_site: número maior que 0 (ou vazio p/ copiar o iFood).");

    const custoRaw = get("custo");
    const custo = custoRaw ? parseNumberCell(custoRaw) : 0;
    if (custoRaw && (!Number.isFinite(custo) || custo < 0))
      errors.push("custo: número >= 0.");

    const pesoG = parseNumberCell(get("peso_g"));
    if (!Number.isInteger(pesoG) || pesoG <= 0)
      errors.push("peso_g: inteiro maior que 0.");

    const serveRaw = get("serve_ate");
    let serveAte: number | undefined;
    if (serveRaw) {
      const n = parseNumberCell(serveRaw);
      if (!Number.isInteger(n) || n <= 0) errors.push("serve_ate: inteiro >= 1 (ou vazio).");
      else serveAte = n;
    }

    const estoqueRaw = get("estoque");
    const estoque = estoqueRaw ? parseNumberCell(estoqueRaw) : 0;
    if (!Number.isInteger(estoque) || estoque < 0)
      errors.push("estoque: inteiro >= 0.");

    const alertaRaw = get("alerta_estoque");
    const alertaEstoque = alertaRaw ? parseNumberCell(alertaRaw) : 3;
    if (!Number.isInteger(alertaEstoque) || alertaEstoque < 1)
      errors.push("alerta_estoque: inteiro >= 1 (ou vazio = 3).");

    const attributes: ProductAttribute[] = [];
    if (parseBoolCell(get("vegano"))) attributes.push("vegano");
    if (parseBoolCell(get("sem_lactose"))) attributes.push("sem-lactose");
    if (parseBoolCell(get("sem_gluten"))) attributes.push("sem-gluten");
    if (parseBoolCell(get("sem_ovo"))) attributes.push("sem-ovo");

    const contains: ProductContains[] = [];
    for (const c of parseListCell(get("contem"))) {
      if ((PRODUCT_CONTAINS as readonly string[]).includes(c)) {
        contains.push(c as ProductContains);
      } else {
        errors.push(`contem: "${c}" inválido. Use: ${PRODUCT_CONTAINS.join(", ")}.`);
      }
    }

    const tags: ProductTag[] = [];
    for (const t of parseListCell(get("tags"))) {
      if ((PRODUCT_TAGS as readonly string[]).includes(t)) {
        tags.push(t as ProductTag);
      } else {
        errors.push(`tags: "${t}" inválida. Use: ${PRODUCT_TAGS.join(", ")}.`);
      }
    }

    const ativo = parseBoolCell(get("ativo"), true);

    if (errors.length > 0) {
      rows.push({ line, ok: false, errors });
    } else {
      rows.push({
        line,
        ok: true,
        data: {
          nome,
          descricao,
          categoriaNome,
          precoSite,
          precoIfood,
          custo,
          pesoG,
          serveAte,
          estoque,
          alertaEstoque,
          attributes,
          contains,
          tags,
          ativo,
        },
      });
    }
  }

  return { rows };
}

/** Slug a partir do nome (mesmo algoritmo das actions). */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
