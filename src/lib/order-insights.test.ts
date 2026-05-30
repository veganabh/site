import { describe, it, expect } from "vitest";
import { buildAbandonmentMetrics, isAbandonedOrder } from "./order-insights";
import type { Order } from "@/types/order";

const NOW = new Date("2026-05-30T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function order(partial: Partial<Order>): Order {
  return {
    id: "o1",
    orderNumber: 1,
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(48),
    status: "NOVO",
    paymentStatus: "PENDENTE",
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
    items: [],
    subtotal: 1000,
    shippingFee: 0,
    discountTotal: 0,
    total: 1000,
    statusHistory: [],
    ...partial,
  } as Order;
}

describe("isAbandonedOrder", () => {
  it("PENDENTE há +24h = abandonado", () => {
    expect(isAbandonedOrder(order({ createdAt: hoursAgo(48) }), NOW)).toBe(true);
  });
  it("PENDENTE há <24h = ainda não", () => {
    expect(isAbandonedOrder(order({ createdAt: hoursAgo(3) }), NOW)).toBe(false);
  });
  it("PAGO nunca é abandono", () => {
    expect(isAbandonedOrder(order({ paymentStatus: "PAGO", createdAt: hoursAgo(48) }), NOW)).toBe(
      false,
    );
  });
  it("CANCELADO nunca é abandono", () => {
    expect(isAbandonedOrder(order({ status: "CANCELADO", createdAt: hoursAgo(48) }), NOW)).toBe(
      false,
    );
  });
});

describe("buildAbandonmentMetrics", () => {
  it("conta, soma valor e calcula taxa", () => {
    const orders = [
      order({ id: "a", paymentStatus: "PENDENTE", createdAt: hoursAgo(48), total: 1000 }),
      order({ id: "b", paymentStatus: "PENDENTE", createdAt: hoursAgo(30), total: 500 }),
      order({ id: "c", paymentStatus: "PENDENTE", createdAt: hoursAgo(2), total: 999 }), // recente, não conta
      order({ id: "d", paymentStatus: "PAGO", total: 2000 }),
      order({ id: "e", paymentStatus: "PAGO", total: 3000 }),
    ];
    const m = buildAbandonmentMetrics(orders, NOW);
    expect(m.count).toBe(2);
    expect(m.value).toBe(1500);
    // 2 abandonados ÷ (2 pagos + 2 abandonados) = 0.5
    expect(m.rate).toBe(0.5);
  });

  it("sem tentativas → taxa 0", () => {
    expect(buildAbandonmentMetrics([], NOW)).toEqual({ count: 0, value: 0, rate: 0 });
  });
});
