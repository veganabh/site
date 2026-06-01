import { describe, it, expect } from "vitest";
import { getCrossSellSuggestion, CROSS_SELL_TIERS } from "./cross-sell";
import type { Product } from "@/types/product";

const makeProduct = (id: string, price_site: number, price_ifood?: number): Product => ({
  id,
  slug: `produto-${id}`,
  name: `Produto ${id}`,
  description: "",
  category: "docinho",
  gramatura_g: 20,
  price_site,
  price_ifood: price_ifood ?? price_site + 1,
  attributes: ["sem-lactose", "vegano"],
  tags: ["favoritos"],
  photo: { url: "", alt: "" },
  active: true,
  stock: 10,
  lowStockThreshold: 3,
  availableForPreorder: false,
});

const ALL_PRODUCTS: readonly Product[] = [
  makeProduct("A", 5), // R$5
  makeProduct("B", 7.5), // R$7.50
  makeProduct("C", 12), // R$12
  makeProduct("D", 22), // R$22
  makeProduct("E", 30), // R$30 — acima do teto máximo (R$25)
];

describe("getCrossSellSuggestion — sem sugestão", () => {
  it("retorna null quando accepted = true", () => {
    const result = getCrossSellSuggestion(50, ALL_PRODUCTS, new Set(), true);
    expect(result).toBeNull();
  });

  it("retorna null quando economia < R$8", () => {
    expect(getCrossSellSuggestion(0, ALL_PRODUCTS, new Set(), false)).toBeNull();
    expect(getCrossSellSuggestion(7.99, ALL_PRODUCTS, new Set(), false)).toBeNull();
  });

  it("retorna null quando todos os produtos elegíveis já estão no carrinho (faixa R$8)", () => {
    // economia = R$8, teto = R$8; elegíveis = A (R$5) e B (R$7.50)
    // com A e B no carrinho, não há candidato → null
    const cartIds = new Set(["A", "B"]);
    expect(getCrossSellSuggestion(8, ALL_PRODUCTS, cartIds, false)).toBeNull();
  });
});

describe("getCrossSellSuggestion — faixas corretas", () => {
  it("faixa R$8–R$15: teto R$8 → sugere produto mais caro até R$8", () => {
    // Produtos elegíveis: A (R$5), B (R$7.50) → mais caro = B
    const result = getCrossSellSuggestion(10, ALL_PRODUCTS, new Set(), false);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("B");
    expect(result!.price_site).toBeLessThanOrEqual(8);
  });

  it("faixa R$15–R$25: teto R$15 → sugere produto mais caro até R$15", () => {
    // Produtos elegíveis: A (R$5), B (R$7.50), C (R$12) → mais caro = C
    const result = getCrossSellSuggestion(20, ALL_PRODUCTS, new Set(), false);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("C");
    expect(result!.price_site).toBeLessThanOrEqual(15);
  });

  it("faixa ≥ R$25: teto R$25 → sugere produto mais caro até R$25", () => {
    // Produtos elegíveis: A, B, C, D (R$22) → mais caro = D
    const result = getCrossSellSuggestion(30, ALL_PRODUCTS, new Set(), false);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("D");
    expect(result!.price_site).toBeLessThanOrEqual(25);
  });

  it("produto E (R$30) nunca é sugerido — acima do teto máximo de R$25", () => {
    const result = getCrossSellSuggestion(100, ALL_PRODUCTS, new Set(), false);
    expect(result?.id).not.toBe("E");
  });
});

describe("getCrossSellSuggestion — exclui produtos já no carrinho", () => {
  it("não sugere produto que já está no carrinho", () => {
    const cartIds = new Set(["B"]); // B é o mais caro elegível na faixa R$8–R$15
    const result = getCrossSellSuggestion(10, ALL_PRODUCTS, cartIds, false);
    // Deve cair para A (R$5) pois B está no carrinho
    expect(result?.id).toBe("A");
  });

  it("retorna null quando todos os elegíveis já estão no carrinho", () => {
    const cartIds = new Set(["A", "B"]); // únicos elegíveis na faixa R$8–R$15
    const result = getCrossSellSuggestion(10, ALL_PRODUCTS, cartIds, false);
    expect(result).toBeNull();
  });
});

describe("CROSS_SELL_TIERS — estrutura", () => {
  it("primeira faixa tem priceCap = 0 (sem sugestão)", () => {
    expect(CROSS_SELL_TIERS[0].priceCap).toBe(0);
    expect(CROSS_SELL_TIERS[0].minInclusive).toBe(0);
  });

  it("faixas cobrem todo o espectro sem lacunas", () => {
    for (let i = 0; i < CROSS_SELL_TIERS.length - 1; i++) {
      expect(CROSS_SELL_TIERS[i].maxExclusive).toBe(CROSS_SELL_TIERS[i + 1].minInclusive);
    }
  });
});
