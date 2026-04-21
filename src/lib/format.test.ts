import { describe, it, expect } from "vitest";
import { formatBRL, formatCEP, computeSavings } from "./format";

describe("formatBRL", () => {
  it("formata inteiro", () => {
    // Locale pt-BR usa non-breaking space (\u00a0) entre R$ e número
    expect(formatBRL(7)).toBe("R$\u00a07,00");
  });

  it("formata decimal com 2 casas", () => {
    expect(formatBRL(17.9)).toBe("R$\u00a017,90");
  });

  it("formata zero", () => {
    expect(formatBRL(0)).toBe("R$\u00a00,00");
  });
});

describe("formatCEP", () => {
  it("formata CEP completo", () => {
    expect(formatCEP("31030000")).toBe("31030-000");
  });

  it("formata CEP parcial (<= 5 dígitos)", () => {
    expect(formatCEP("310")).toBe("310");
  });

  it("remove caracteres não-numéricos", () => {
    expect(formatCEP("31.030-000 abc")).toBe("31030-000");
  });
});

describe("computeSavings", () => {
  it("retorna zero quando não há economia (iFood igual ao site)", () => {
    expect(computeSavings([{ priceSite: 10, priceIfood: 10, quantity: 2 }])).toBe(0);
  });

  it("retorna zero quando iFood está mais barato (sem economia)", () => {
    expect(computeSavings([{ priceSite: 10, priceIfood: 8, quantity: 1 }])).toBe(0);
  });

  it("soma economia por quantidade e entre itens", () => {
    const result = computeSavings([
      { priceSite: 7, priceIfood: 8, quantity: 2 },
      { priceSite: 17.9, priceIfood: 18.9, quantity: 1 },
    ]);
    expect(result).toBeCloseTo(3, 2);
  });
});
