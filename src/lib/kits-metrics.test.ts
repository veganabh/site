import { describe, it, expect } from "vitest";
import { calcKitsMetrics } from "./kits-metrics";
import type { GiftKitTemplate } from "@/types/gift-kit";

function kit(partial: Partial<GiftKitTemplate>): GiftKitTemplate {
  return {
    id: "k1",
    slug: "kit",
    name: "Kit",
    tagline: "tag",
    description: "desc",
    price: 100,
    priceIfoodAnchor: 130,
    iconName: "Gift",
    coverPhoto: { url: "/x.jpg", alt: "x" },
    slots: [],
    active: true,
    ...partial,
  } as GiftKitTemplate;
}

describe("calcKitsMetrics", () => {
  it("catálogo vazio → tudo zero", () => {
    expect(calcKitsMetrics([])).toEqual({
      activeCount: 0,
      inactiveCount: 0,
      total: 0,
      avgEconomy: 0,
      avgTicket: 0,
      minPrice: 0,
      maxPrice: 0,
    });
  });

  it("conta ativos/inativos e total", () => {
    const m = calcKitsMetrics([
      kit({ id: "a", active: true }),
      kit({ id: "b", active: false }),
      kit({ id: "c", active: true }),
    ]);
    expect(m.total).toBe(3);
    expect(m.activeCount).toBe(2);
    expect(m.inactiveCount).toBe(1);
  });

  it("média de economia e ticket sobre TODOS os kits", () => {
    const m = calcKitsMetrics([
      kit({ id: "a", price: 100, priceIfoodAnchor: 130 }), // economia 30
      kit({ id: "b", price: 200, priceIfoodAnchor: 260 }), // economia 60
    ]);
    expect(m.avgTicket).toBe(150); // (100+200)/2
    expect(m.avgEconomy).toBe(45); // (30+60)/2
  });

  it("faixa de preço min/max", () => {
    const m = calcKitsMetrics([
      kit({ id: "a", price: 80 }),
      kit({ id: "b", price: 250 }),
      kit({ id: "c", price: 120 }),
    ]);
    expect(m.minPrice).toBe(80);
    expect(m.maxPrice).toBe(250);
  });
});
