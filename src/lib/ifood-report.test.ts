import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  parseMoneyToCents,
  parseIntCell,
  normalizeHeader,
  parseDateBR,
  parseIfoodItemsReport,
  parseIfoodOrdersReport,
  parseIfoodReport,
} from "./ifood-report";

const ORDERS_HEADER = [
  "ID COMPLETO DO PEDIDO",
  "DATA E HORA DO PEDIDO",
  "STATUS FINAL DO PEDIDO",
  "TOTAL PAGO PELO CLIENTE (R$)",
  "TAXAS E COMISSOES (R$)",
  "VALOR LIQUIDO (R$)",
  "FORMA DE PAGAMENTO",
];

/** Monta um xlsx em memória com as abas dadas → Buffer pro parser. */
async function buildXlsx(
  sheets: { name: string; header: string[]; rows: (string | number)[][] }[],
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.addRow(s.header);
    for (const r of s.rows) ws.addRow(r);
  }
  // exceljs tipa o retorno como Buffer próprio; em runtime é um Node Buffer.
  return (await wb.xlsx.writeBuffer()) as unknown as Uint8Array;
}

const ITEMS_HEADER = [
  "Posição no ranking",
  "Categoria",
  "Nome do item",
  "Visitas",
  "Vendas",
  "Total vendas",
];

describe("parseMoneyToCents", () => {
  it("formato BR com R$ e espaço fino → centavos", () => {
    expect(parseMoneyToCents("R$ 3.672,00")).toBe(367200);
    expect(parseMoneyToCents("R$ 1.176,00")).toBe(117600); // NBSP
    expect(parseMoneyToCents("R$ 2.286,90")).toBe(228690);
    expect(parseMoneyToCents("20,90")).toBe(2090);
  });
  it("número cru → centavos", () => {
    expect(parseMoneyToCents(8.5)).toBe(850);
    expect(parseMoneyToCents(0)).toBe(0);
  });
  it("vazio / inválido → null", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents(null)).toBeNull();
    expect(parseMoneyToCents(undefined)).toBeNull();
  });
});

describe("parseIntCell", () => {
  it("string e número → inteiro", () => {
    expect(parseIntCell("459")).toBe(459);
    expect(parseIntCell(198)).toBe(198);
    expect(parseIntCell("1.234")).toBe(1234); // separador de milhar
  });
  it("vazio → null", () => {
    expect(parseIntCell("")).toBeNull();
    expect(parseIntCell(null)).toBeNull();
  });
});

describe("normalizeHeader", () => {
  it("tira acento, baixa caixa, colapsa espaço", () => {
    expect(normalizeHeader("Posição no ranking")).toBe("posicao no ranking");
    expect(normalizeHeader("Total vendas")).toBe("total vendas");
    expect(normalizeHeader("  Nome  do   item ")).toBe("nome do item");
  });
});

describe("parseIfoodItemsReport", () => {
  it("acha a aba de itens (ignora decoy) e parseia qtd + receita reais", async () => {
    const buf = await buildXlsx([
      { name: "Resumo", header: ["Métrica", "Valor"], rows: [["Total", "R$ 1,00"]] },
      {
        name: "Itens do cardápio",
        header: ITEMS_HEADER,
        rows: [
          ["1", "Docinhos", "Palha Italiana", "313", "459", "R$ 3.672,00"],
          ["2", "Delícias no Pote", "Bolo no Pote de Brigadeiro", "299", "198", "R$ 3.742,20"],
          ["4", "Docinhos", "Bombom de Brigadeiro", "106", "147", "R$ 1.176,00"],
        ],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sheetName).toBe("Itens do cardápio");
    expect(res.rows).toHaveLength(3);
    const palha = res.rows.find((r) => r.ifoodName === "Palha Italiana")!;
    expect(palha.qty).toBe(459);
    expect(palha.revenueCents).toBe(367200);
    expect(palha.category).toBe("Docinhos");
    const bombom = res.rows.find((r) => r.ifoodName === "Bombom de Brigadeiro")!;
    expect(bombom.revenueCents).toBe(117600);
  });

  it("detecta colunas por nome mesmo sem 'Visitas'", async () => {
    const buf = await buildXlsx([
      {
        name: "Complementos",
        header: ["Posição no ranking", "Categoria", "Nome do item", "Vendas", "Total vendas"],
        rows: [["1", "Bebidas", "Suco", "10", "R$ 50,00"]],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows[0]).toMatchObject({ ifoodName: "Suco", qty: 10, revenueCents: 5000 });
  });

  it("consolida linhas com o mesmo nome", async () => {
    const buf = await buildXlsx([
      {
        name: "Itens do cardápio",
        header: ITEMS_HEADER,
        rows: [
          ["1", "Docinhos", "Palha Italiana", "100", "5", "R$ 40,00"],
          ["2", "Docinhos", "Palha Italiana", "50", "3", "R$ 24,00"],
        ],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].qty).toBe(8);
    expect(res.rows[0].revenueCents).toBe(6400);
  });

  it("pula linhas sem nome", async () => {
    const buf = await buildXlsx([
      {
        name: "Itens do cardápio",
        header: ITEMS_HEADER,
        rows: [
          ["1", "Docinhos", "Palha Italiana", "100", "5", "R$ 40,00"],
          ["", "", "", "", "", ""],
        ],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(1);
  });

  it("escolhe 'Itens do cardápio' quando 'Complementos' (vazia) também casa o header", async () => {
    // Espelha o arquivo real: Complementos vem antes e está vazia.
    const buf = await buildXlsx([
      {
        name: "Complementos do cardápio",
        header: ["Posição no ranking", "Categoria", "Nome do item", "Vendas", "Total vendas"],
        rows: [],
      },
      {
        name: "Itens do cardápio",
        header: ITEMS_HEADER,
        rows: [["1", "Docinhos", "Palha Italiana", "313", "459", "R$ 3.672,00"]],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sheetName).toBe("Itens do cardápio");
    expect(res.rows).toHaveLength(1);
  });

  it("sem aba preferida, escolhe a que casa com mais linhas", async () => {
    const buf = await buildXlsx([
      {
        name: "Aba A",
        header: ["Categoria", "Nome do item", "Vendas", "Total vendas"],
        rows: [["x", "Item A", "1", "R$ 1,00"]],
      },
      {
        name: "Aba B",
        header: ["Categoria", "Nome do item", "Vendas", "Total vendas"],
        rows: [
          ["x", "Item B1", "1", "R$ 1,00"],
          ["x", "Item B2", "2", "R$ 2,00"],
        ],
      },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sheetName).toBe("Aba B");
    expect(res.rows).toHaveLength(2);
  });

  it("sem as colunas obrigatórias → erro", async () => {
    const buf = await buildXlsx([
      { name: "Qualquer", header: ["A", "B", "C"], rows: [["x", "y", "z"]] },
    ]);
    const res = await parseIfoodItemsReport(buf);
    expect(res.ok).toBe(false);
  });
});

describe("parseDateBR", () => {
  it("DD/MM/YYYY HH:MM:SS → ISO (UTC, data estável)", () => {
    expect(parseDateBR("28/02/2026 21:40:24")).toBe("2026-02-28T21:40:24.000Z");
    expect(parseDateBR("01/03/2026")).toBe("2026-03-01T00:00:00.000Z");
  });
  it("Date → ISO; inválido → null", () => {
    expect(parseDateBR(new Date("2026-05-10T12:00:00Z"))).toBe("2026-05-10T12:00:00.000Z");
    expect(parseDateBR("xx")).toBeNull();
    expect(parseDateBR(null)).toBeNull();
  });
});

describe("parseIfoodOrdersReport", () => {
  it("parseia pedidos: números crus, taxa negativa vira módulo, período dos dados", async () => {
    const buf = await buildXlsx([
      {
        name: "Página 1",
        header: ORDERS_HEADER,
        rows: [
          ["uuid-1", "28/02/2026 21:40:24", "CONCLUIDO", 80.99, -20.96, 59.04, "Crédito"],
          ["uuid-2", "01/03/2026 12:00:00", "CONCLUIDO", 26.1, -9.9, 27.9, "Pix"],
          ["uuid-3", "19/03/2026 10:00:00", "CANCELADO", 22.9, -6.0, 0, "Pix"],
        ],
      },
    ]);
    const res = await parseIfoodOrdersReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(3);
    expect(res.periodStart).toBe("2026-02-28");
    expect(res.periodEnd).toBe("2026-03-19");
    const o1 = res.rows[0];
    expect(o1.ifoodOrderId).toBe("uuid-1");
    expect(o1.totalPaidCents).toBe(8099);
    expect(o1.feesCents).toBe(2096); // módulo
    expect(o1.netCents).toBe(5904);
    expect(o1.status).toBe("CONCLUIDO");
  });

  it("dedup por ID do pedido", async () => {
    const buf = await buildXlsx([
      {
        name: "Página 1",
        header: ORDERS_HEADER,
        rows: [
          ["uuid-1", "28/02/2026 21:40:24", "CONCLUIDO", 80.99, -20.96, 59.04, "Crédito"],
          ["uuid-1", "28/02/2026 21:40:24", "CONCLUIDO", 80.99, -20.96, 59.04, "Crédito"],
        ],
      },
    ]);
    const res = await parseIfoodOrdersReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rows).toHaveLength(1);
  });
});

describe("parseIfoodReport (auto-detect)", () => {
  it("detecta 'orders' pelo cabeçalho financeiro", async () => {
    const buf = await buildXlsx([
      {
        name: "Página 1",
        header: ORDERS_HEADER,
        rows: [["uuid-1", "28/02/2026 21:40:24", "CONCLUIDO", 80.99, -20.96, 59.04, "Pix"]],
      },
    ]);
    const res = await parseIfoodReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.kind).toBe("orders");
  });

  it("detecta 'items' pelo cabeçalho de produto", async () => {
    const buf = await buildXlsx([
      {
        name: "Itens do cardápio",
        header: ITEMS_HEADER,
        rows: [["1", "Docinhos", "Palha Italiana", "313", "459", "R$ 3.672,00"]],
      },
    ]);
    const res = await parseIfoodReport(buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.kind).toBe("items");
  });

  it("arquivo irreconhecível → erro", async () => {
    const buf = await buildXlsx([{ name: "X", header: ["A", "B"], rows: [["1", "2"]] }]);
    const res = await parseIfoodReport(buf);
    expect(res.ok).toBe(false);
  });
});
