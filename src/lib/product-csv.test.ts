import { describe, it, expect } from "vitest";
import {
  buildTemplateCsv,
  parseCsv,
  parseNumberCell,
  parseBoolCell,
  parseProductCsv,
  toSlug,
  CSV_COLUMNS,
} from "./product-csv";

describe("parseNumberCell", () => {
  it("aceita vírgula decimal pt-BR", () => {
    expect(parseNumberCell("21,90")).toBe(21.9);
  });
  it("aceita ponto decimal", () => {
    expect(parseNumberCell("21.90")).toBe(21.9);
  });
  it("trata ponto de milhar + vírgula decimal", () => {
    expect(parseNumberCell("1.234,56")).toBe(1234.56);
  });
  it("vazio é NaN", () => {
    expect(Number.isNaN(parseNumberCell(""))).toBe(true);
  });
});

describe("parseBoolCell", () => {
  it("sim/x/1 são true", () => {
    expect(parseBoolCell("sim")).toBe(true);
    expect(parseBoolCell("x")).toBe(true);
    expect(parseBoolCell("1")).toBe(true);
  });
  it("nao/false são false", () => {
    expect(parseBoolCell("nao")).toBe(false);
    expect(parseBoolCell("não")).toBe(false);
  });
  it("respeita default no vazio", () => {
    expect(parseBoolCell("", true)).toBe(true);
    expect(parseBoolCell("", false)).toBe(false);
  });
});

describe("parseCsv", () => {
  it("detecta ; e respeita aspas com delimitador interno", () => {
    const text = 'a;b;c\r\n1;"dois; e meio";3\r\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["1", "dois; e meio", "3"],
    ]);
  });
  it("usa vírgula quando não há ponto-e-vírgula", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("remove BOM e linhas vazias", () => {
    expect(parseCsv("﻿a;b\n\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toSlug", () => {
  it("normaliza acentos e espaços", () => {
    expect(toSlug("Bolo no Pote de Brigadeiro")).toBe("bolo-no-pote-de-brigadeiro");
    expect(toSlug("Delícias no Pote")).toBe("delicias-no-pote");
  });
});

describe("parseProductCsv", () => {
  it("o template gerado parseia sem erro", () => {
    const parsed = parseProductCsv(buildTemplateCsv());
    expect(parsed.fatal).toBeUndefined();
    expect(parsed.rows).toHaveLength(1);
    const row = parsed.rows[0];
    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.data.nome).toBe("Bolo no Pote de Brigadeiro");
      expect(row.data.precoIfood).toBe(21.9);
      expect(row.data.precoSite).toBe(21.9); // copiado do iFood
      expect(row.data.attributes).toContain("vegano");
      expect(row.data.attributes).toContain("sem-lactose");
      expect(row.data.attributes).toContain("sem-ovo");
      expect(row.data.attributes).not.toContain("sem-gluten");
      expect(row.data.contains).toEqual(["castanha-de-caju", "trigo", "cacau"]);
      expect(row.data.serveAte).toBe(1);
    }
  });

  it("preco_site vazio copia preco_ifood", () => {
    const csv = [CSV_COLUMNS.join(";"), "Doce X;Descrição longa o suficiente;Doces;;15,00;;100;;0;;sim;;;;;;sim"].join(
      "\n",
    );
    const parsed = parseProductCsv(csv);
    const row = parsed.rows[0];
    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.data.precoSite).toBe(15);
      expect(row.data.precoIfood).toBe(15);
    }
  });

  it("cabeçalho faltando coluna vira fatal", () => {
    const parsed = parseProductCsv("nome;descricao\nA;B");
    expect(parsed.fatal).toContain("Faltam as colunas");
  });

  it("contem inválido vira erro de linha", () => {
    const csv = [
      CSV_COLUMNS.join(";"),
      "Doce X;Descrição longa o suficiente;Doces;15,00;15,00;;100;;0;;sim;;;;leite;;sim",
    ].join("\n");
    const parsed = parseProductCsv(csv);
    const row = parsed.rows[0];
    expect(row.ok).toBe(false);
    if (!row.ok) {
      expect(row.errors.join(" ")).toContain("contem");
    }
  });

  it("nome curto e preço inválido acumulam erros", () => {
    const csv = [
      CSV_COLUMNS.join(";"),
      "A;curta;Doces;abc;abc;;0;;0;;;;;;;;",
    ].join("\n");
    const parsed = parseProductCsv(csv);
    const row = parsed.rows[0];
    expect(row.ok).toBe(false);
    if (!row.ok) {
      expect(row.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});
