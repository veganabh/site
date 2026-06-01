import { describe, it, expect } from "vitest";
import { channelMargin, marginByChannel, FEES } from "./fees";

describe("channelMargin", () => {
  // Croquete: site 26,90 / iFood 28,90 / CPV 3,83
  it("iFood desconta 26,2% sobre a venda", () => {
    const m = channelMargin("ifood", 28.9, 3.83);
    // 28,90 - 3,83 - (28,90*0,262=7,5718) = 17,4982
    expect(m.profit).toBeCloseTo(17.5, 1);
    expect(m.pct).toBeCloseTo(0.605, 2);
  });

  it("PIX desconta R$0,80 fixo", () => {
    const m = channelMargin("pix", 26.9, 3.83);
    // 26,90 - 3,83 - 0,80 = 22,27
    expect(m.profit).toBeCloseTo(22.27, 2);
    expect(m.pct).toBeCloseTo(0.828, 2);
  });

  it("cartão desconta 3,5% + R$0,60", () => {
    const m = channelMargin("card", 26.9, 3.83);
    // 26,90 - 3,83 - (26,90*0,035=0,9415 + 0,60=1,5415) = 21,5285
    expect(m.profit).toBeCloseTo(21.53, 2);
  });

  it("sem CPV (cost 0) → profit/pct null, não inventa", () => {
    const m = channelMargin("pix", 26.9, 0);
    expect(m.profit).toBeNull();
    expect(m.pct).toBeNull();
  });

  it("preço 0 → null", () => {
    expect(channelMargin("ifood", 0, 3.83).profit).toBeNull();
  });

  it("PIX rende mais que iFood no mesmo produto (taxa fixa vence % em ticket alto)", () => {
    const pix = channelMargin("pix", 26.9, 3.83).profit!;
    const ifood = channelMargin("ifood", 28.9, 3.83).profit!;
    expect(pix).toBeGreaterThan(ifood);
  });
});

describe("marginByChannel", () => {
  it("retorna os 3 canais", () => {
    const r = marginByChannel({ priceSite: 8, priceIfood: 9, cost: 1.35 });
    // Palha: iFood 9-1,35-2,358=5,292 ; pix 8-1,35-0,80=5,85 ; card 8-1,35-0,88=5,77
    expect(r.ifood.profit).toBeCloseTo(5.29, 1);
    expect(r.pix.profit).toBeCloseTo(5.85, 2);
    expect(r.card.profit).toBeCloseTo(5.77, 2);
  });

  it("propaga null quando sem custo", () => {
    const r = marginByChannel({ priceSite: 8, priceIfood: 9, cost: 0 });
    expect(r.ifood.profit).toBeNull();
    expect(r.pix.profit).toBeNull();
    expect(r.card.profit).toBeNull();
  });
});

describe("FEES (sanidade das constantes)", () => {
  it("taxas batem com o doc financeiro", () => {
    expect(FEES.ifoodRate).toBe(0.262);
    expect(FEES.pixFixed).toBe(0.8);
    expect(FEES.cardRate).toBe(0.035);
    expect(FEES.cardFixed).toBe(0.6);
  });
});
