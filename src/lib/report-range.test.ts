import { describe, it, expect } from "vitest";
import {
  resolveReportRange,
  filterOrdersByRange,
  buildDailySeries,
  isoDay,
} from "./order-insights";
import type { Order } from "@/types/order";

const NOW = new Date("2026-05-30T12:00:00");

function order(partial: Partial<Order>): Order {
  return {
    id: "o1",
    orderNumber: 1,
    createdAt: "2026-05-30T10:00:00",
    updatedAt: "2026-05-30T10:00:00",
    status: "NOVO",
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
    items: [],
    subtotal: 1000,
    shippingFee: 0,
    discountTotal: 0,
    total: 1000,
    statusHistory: [],
    ...partial,
  } as Order;
}

describe("resolveReportRange", () => {
  it("preset 7d → janela rolante de 7 dias terminando agora", () => {
    const r = resolveReportRange("7d", undefined, undefined, NOW);
    expect(r.end).toBe(NOW.getTime());
    expect(r.start).toBe(NOW.getTime() - 7 * 86_400_000);
    expect(r.label).toBe("7 dias");
  });

  it("'all' e desconhecido → sem limites", () => {
    expect(resolveReportRange("all", undefined, undefined, NOW)).toEqual({
      start: null,
      end: null,
      label: "Tudo",
    });
    expect(resolveReportRange("xyz", undefined, undefined, NOW).start).toBeNull();
  });

  it("custom com from+to → limites inclusivos do dia", () => {
    const r = resolveReportRange("custom", "2026-05-01", "2026-05-10", NOW);
    expect(isoDay(r.start as number)).toBe("2026-05-01");
    expect(isoDay(r.end as number)).toBe("2026-05-10");
    expect(r.label).toBe("2026-05-01 → 2026-05-10");
  });

  it("custom com datas trocadas → inverte", () => {
    const r = resolveReportRange("custom", "2026-05-10", "2026-05-01", NOW);
    expect(isoDay(r.start as number)).toBe("2026-05-01");
    expect(isoDay(r.end as number)).toBe("2026-05-10");
  });

  it("custom sem datas válidas → cai pra 'all'", () => {
    expect(resolveReportRange("custom", undefined, undefined, NOW)).toEqual({
      start: null,
      end: null,
      label: "Tudo",
    });
  });

  it("custom só com 'from' → range aberto à direita", () => {
    const r = resolveReportRange("custom", "2026-05-01", undefined, NOW);
    expect(isoDay(r.start as number)).toBe("2026-05-01");
    expect(r.end).toBeNull();
  });
});

describe("filterOrdersByRange", () => {
  const orders = [
    order({ id: "a", createdAt: "2026-05-01T10:00:00" }),
    order({ id: "b", createdAt: "2026-05-05T10:00:00" }),
    order({ id: "c", createdAt: "2026-05-10T10:00:00" }),
  ];

  it("filtra dentro do range inclusivo", () => {
    const r = resolveReportRange("custom", "2026-05-02", "2026-05-09", NOW);
    const out = filterOrdersByRange(orders, r);
    expect(out.map((o) => o.id)).toEqual(["b"]);
  });

  it("range aberto (all) devolve tudo", () => {
    const out = filterOrdersByRange(orders, { start: null, end: null, label: "Tudo" });
    expect(out).toHaveLength(3);
  });

  it("inclui as bordas do dia (início e fim)", () => {
    const r = resolveReportRange("custom", "2026-05-01", "2026-05-10", NOW);
    expect(filterOrdersByRange(orders, r)).toHaveLength(3);
  });
});

describe("buildDailySeries", () => {
  it("série contínua com dias zerados entre pedidos", () => {
    const orders = [
      order({ id: "a", createdAt: "2026-05-01T10:00:00", total: 100 }),
      order({ id: "b", createdAt: "2026-05-03T10:00:00", total: 200 }),
    ];
    const r = resolveReportRange("custom", "2026-05-01", "2026-05-03", NOW);
    const series = buildDailySeries(orders, r);
    expect(series.map((s) => s.date)).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
    expect(series[0]).toMatchObject({ orders: 1, revenue: 100, avgTicket: 100 });
    expect(series[1]).toMatchObject({ orders: 0, revenue: 0, avgTicket: 0 }); // dia vazio
    expect(series[2]).toMatchObject({ orders: 1, revenue: 200, avgTicket: 200 });
  });

  it("soma múltiplos pedidos no mesmo dia + ticket médio", () => {
    const orders = [
      order({ id: "a", createdAt: "2026-05-01T09:00:00", total: 100 }),
      order({ id: "b", createdAt: "2026-05-01T20:00:00", total: 300 }),
    ];
    const r = resolveReportRange("custom", "2026-05-01", "2026-05-01", NOW);
    const series = buildDailySeries(orders, r);
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ orders: 2, revenue: 400, avgTicket: 200 });
  });

  it("ignora pedidos CANCELADO", () => {
    const orders = [
      order({ id: "a", createdAt: "2026-05-01T10:00:00", total: 100, status: "CANCELADO" }),
      order({ id: "b", createdAt: "2026-05-01T10:00:00", total: 200 }),
    ];
    const r = resolveReportRange("custom", "2026-05-01", "2026-05-01", NOW);
    expect(buildDailySeries(orders, r)[0]).toMatchObject({ orders: 1, revenue: 200 });
  });

  it("range aberto deriva limites do primeiro/último pedido", () => {
    const orders = [
      order({ id: "a", createdAt: "2026-05-01T10:00:00" }),
      order({ id: "b", createdAt: "2026-05-04T10:00:00" }),
    ];
    const series = buildDailySeries(orders, { start: null, end: null, label: "Tudo" });
    expect(series).toHaveLength(4); // 01,02,03,04
  });

  it("sem pedidos e range aberto → vazio", () => {
    expect(buildDailySeries([], { start: null, end: null, label: "Tudo" })).toEqual([]);
  });
});
