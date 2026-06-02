import { describe, it, expect } from "vitest";
import { buildChannelProfit } from "./channel-profit";
import type { Order, OrderItem } from "@/types/order";
import type { Product } from "@/types/product";

function product(p: Partial<Product>): Product {
  return {
    id: "p1",
    name: "Produto",
    slug: "produto",
    category: "docinhos",
    description: "",
    price_site: 8,
    price_ifood: 9,
    cost: 1.35,
    stock: 10,
    lowStockThreshold: 3,
    active: true,
    photo: { url: "", alt: "" },
    gramatura_g: 0,
    attributes: [],
    tags: [],
    contains: [],
    availableForPreorder: false,
    ...p,
  } as Product;
}

function item(p: Partial<OrderItem>): OrderItem {
  return {
    productId: "p1",
    productName: "Produto",
    productCategory: "docinhos",
    qty: 1,
    unitPriceSite: 8,
    unitPriceIfood: 9,
    ...p,
  } as OrderItem;
}

function order(
  source: "site" | "ifood",
  items: OrderItem[],
  status: Order["status"] = "ENTREGUE",
): Order {
  return {
    id: "o" + Math.round(items.length * 7),
    orderNumber: 1,
    createdAt: "2026-05-15T12:00:00",
    updatedAt: "2026-05-15T12:00:00",
    status,
    paymentStatus: "PAGO",
    customerId: "c1",
    customerName: "Cliente",
    customerPhone: "31999999999",
    shippingAddress: {
      street: "R",
      number: "1",
      neighborhood: "Centro",
      city: "BH",
      state: "MG",
      cep: "30000-000",
    },
    items,
    subtotal: 0,
    shippingFee: 0,
    discountTotal: 0,
    total: 0,
    statusHistory: [],
    source,
    orderType: "daily",
  } as Order;
}

describe("buildChannelProfit", () => {
  it("conta vendas no canal real (source) e aplica taxa de cada canal", () => {
    // Palha: site 8 / iFood 9 / CPV 1,35. iFood unit=5,292 ; site PIX unit=5,85
    const prods = [
      product({ id: "palha", name: "Palha", price_site: 8, price_ifood: 9, cost: 1.35 }),
    ];
    const orders = [
      order("ifood", [item({ productId: "palha", qty: 10 })]),
      order("site", [item({ productId: "palha", qty: 4 })]),
    ];
    const r = buildChannelProfit(orders, prods);
    const row = r.rows.find((x) => x.productId === "palha")!;
    expect(row.unitsIfood).toBe(10);
    expect(row.unitsSite).toBe(4);
    expect(row.profitIfood).toBeCloseTo(52.92, 1); // 5,292 × 10
    expect(row.profitSite).toBeCloseTo(23.4, 1); // 5,85 × 4
  });

  it("margem líquida ≠ bruta: desconta a taxa do canal", () => {
    const prods = [product({ id: "c", price_site: 26.9, price_ifood: 28.9, cost: 3.83 })];
    const orders = [order("ifood", [item({ productId: "c", qty: 1 })])];
    const r = buildChannelProfit(orders, prods);
    const row = r.rows[0];
    // bruto seria 28,90-3,83=25,07; líquido = 17,50 (desconta 26,2%)
    expect(row.profitIfood).toBeCloseTo(17.5, 1);
    expect(row.pctIfood).toBeCloseTo(0.605, 2);
  });

  it("ganho de migração = vendas iFood × (lucro site − lucro iFood)", () => {
    // Bolo no Pote: site 20,90 / iFood 21,90 / CPV 4,73
    // iFood unit = 21,90-4,73-5,7378 = 11,4322 ; site = 20,90-4,73-0,80 = 15,37
    // diff unit ≈ 3,938 ; × 5 vendas iFood ≈ 19,69
    const prods = [product({ id: "pote", price_site: 20.9, price_ifood: 21.9, cost: 4.73 })];
    const orders = [order("ifood", [item({ productId: "pote", qty: 5 })])];
    const r = buildChannelProfit(orders, prods);
    expect(r.rows[0].migrationGain).toBeCloseTo(19.69, 0);
    expect(r.totalMigrationGain).toBeCloseTo(19.69, 0);
  });

  it("vendas que JÁ são do site não geram ganho de migração", () => {
    const prods = [product({ id: "x", cost: 1.35 })];
    const orders = [order("site", [item({ productId: "x", qty: 10 })])];
    const r = buildChannelProfit(orders, prods);
    expect(r.rows[0].migrationGain).toBe(0); // unitsIfood=0
  });

  it("sem CPV → lucro null, conta em missingCostCount, não inventa", () => {
    const prods = [product({ id: "semcpv", cost: 0 })];
    const orders = [order("ifood", [item({ productId: "semcpv", qty: 3 })])];
    const r = buildChannelProfit(orders, prods);
    expect(r.rows[0].profitIfood).toBeNull();
    expect(r.rows[0].profitSite).toBeNull();
    expect(r.rows[0].migrationGain).toBeNull();
    expect(r.missingCostCount).toBe(1);
    expect(r.totalProfit).toBe(0); // null não soma
  });

  it("ignora pedidos CANCELADO", () => {
    const prods = [product({ id: "p", cost: 1.35 })];
    const orders = [order("ifood", [item({ productId: "p", qty: 5 })], "CANCELADO")];
    const r = buildChannelProfit(orders, prods);
    expect(r.rows).toHaveLength(0);
    expect(r.totalProfit).toBe(0);
  });

  it("totais agregam os dois canais", () => {
    const prods = [
      product({ id: "a", price_site: 8, price_ifood: 9, cost: 1.35 }),
      product({ id: "b", price_site: 20.9, price_ifood: 21.9, cost: 4.73 }),
    ];
    const orders = [
      order("ifood", [item({ productId: "a", qty: 2 }), item({ productId: "b", qty: 1 })]),
      order("site", [item({ productId: "a", qty: 1 })]),
    ];
    const r = buildChannelProfit(orders, prods);
    expect(r.totalProfit).toBeCloseTo(r.totalProfitIfood + r.totalProfitSite, 5);
    expect(r.totalProfitIfood).toBeGreaterThan(0);
    expect(r.totalProfitSite).toBeGreaterThan(0);
  });
});
