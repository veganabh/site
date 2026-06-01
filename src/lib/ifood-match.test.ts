import { describe, it, expect } from "vitest";
import { nameTokens, bestProductMatch } from "./ifood-match";

describe("nameTokens", () => {
  it("tira acento, stopword e pontuação", () => {
    expect(nameTokens("Bolo de Cenoura com Cobertura de Brigadeiro")).toEqual([
      "bolo",
      "cenoura",
      "brigadeiro",
    ]);
    expect(nameTokens("Palha Italiana")).toEqual(["palha", "italiana"]);
    expect(nameTokens("Brigadeiro Vegano")).toEqual(["brigadeiro"]);
  });
});

describe("bestProductMatch", () => {
  const catalogo = [
    { id: "palha", name: "Palha Italiana" },
    { id: "cenoura", name: "Bolo de Cenoura" },
    { id: "brigadeiro", name: "Bombom de Brigadeiro" },
    { id: "pote-brig", name: "Bolo no Pote de Brigadeiro" },
  ];

  it("nome idêntico → match com score alto", () => {
    const m = bestProductMatch("Palha Italiana", catalogo);
    expect(m?.id).toBe("palha");
    expect(m?.score).toBeGreaterThanOrEqual(0.99);
  });

  it("nome iFood mais longo casa por inclusão de tokens", () => {
    // "Bolo de Cenoura com Cobertura de Brigadeiro" contém "bolo cenoura"
    const m = bestProductMatch("Bolo de Cenoura com Cobertura de Brigadeiro", catalogo);
    expect(m?.id).toBe("cenoura");
  });

  it("retorna null quando nada passa do threshold", () => {
    const m = bestProductMatch("Suco de Laranja", catalogo);
    expect(m).toBeNull();
  });

  it("distingue produtos parecidos pelo conjunto de tokens", () => {
    const m = bestProductMatch("Bolo no Pote de Brigadeiro", catalogo);
    expect(m?.id).toBe("pote-brig");
  });
});
