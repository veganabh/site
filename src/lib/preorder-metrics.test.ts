import { describe, it, expect } from "vitest";
import { buildPreorderMonthMetrics } from "./preorder-metrics";
import type { Order } from "@/types/order";

const NOW = new Date(2026, 5, 10); // 2026-06-10

function po(p: Partial<Order>): Order {
  return {
    id: Math.random().toString(36).slice(2),
    orderType: "preorder",
    status: "NOVO",
    paymentStatus: "PAGO",
    total: 100,
    scheduledDate: "2026-06-20",
    ...p,
  } as Order;
}

describe("buildPreorderMonthMetrics", () => {
  it("só conta confirmadas (PAGO, não cancelada) com entrega no mês", () => {
    const m = buildPreorderMonthMetrics(
      [
        po({ total: 100, scheduledDate: "2026-06-15" }), // conta
        po({ total: 200, scheduledDate: "2026-06-28" }), // conta
        po({ total: 999, scheduledDate: "2026-07-02" }), // fora do mês
        po({ total: 50, scheduledDate: "2026-06-18", paymentStatus: "PENDENTE" }), // não paga
        po({ total: 50, scheduledDate: "2026-06-18", status: "CANCELADO" }), // cancelada
      ],
      NOW,
    );
    expect(m.count).toBe(2);
    expect(m.revenue).toBe(300);
    expect(m.avgTicket).toBe(150);
  });

  it("toProduce = confirmadas do mês não entregues", () => {
    const m = buildPreorderMonthMetrics(
      [
        po({ scheduledDate: "2026-06-15", status: "PREPARANDO" }),
        po({ scheduledDate: "2026-06-16", status: "ENTREGUE" }),
      ],
      NOW,
    );
    expect(m.count).toBe(2);
    expect(m.toProduce).toBe(1);
  });

  it("next7Days = confirmadas a entregar em até 7 dias, não entregues", () => {
    const m = buildPreorderMonthMetrics(
      [
        po({ scheduledDate: "2026-06-12" }), // dentro de 7d
        po({ scheduledDate: "2026-06-17" }), // exatamente +7
        po({ scheduledDate: "2026-06-25" }), // fora de 7d
        po({ scheduledDate: "2026-06-12", status: "ENTREGUE" }), // já entregue
      ],
      NOW,
    );
    expect(m.next7Days).toBe(2);
  });

  it("awaitingPayment conta PENDENTE não-canceladas (qualquer data)", () => {
    const m = buildPreorderMonthMetrics(
      [
        po({ paymentStatus: "PENDENTE", scheduledDate: "2026-07-30" }),
        po({ paymentStatus: "PENDENTE", scheduledDate: "2026-06-20" }),
        po({ paymentStatus: "PENDENTE", status: "CANCELADO" }),
        po({ paymentStatus: "PAGO" }),
      ],
      NOW,
    );
    expect(m.awaitingPayment).toBe(2);
  });

  it("vazio → zeros", () => {
    const m = buildPreorderMonthMetrics([], NOW);
    expect(m).toEqual({
      revenue: 0,
      count: 0,
      avgTicket: 0,
      toProduce: 0,
      next7Days: 0,
      awaitingPayment: 0,
    });
  });
});
