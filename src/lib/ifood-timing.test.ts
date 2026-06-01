import { describe, it, expect } from "vitest";
import { normalizePaymentMethod, buildIfoodTiming } from "./ifood-timing";

describe("normalizePaymentMethod", () => {
  it("agrupa o texto bagunçado do iFood em baldes", () => {
    expect(normalizePaymentMethod("Pgto via APP - Crédito (Mastercard)")).toBe("Crédito");
    expect(normalizePaymentMethod("Pgto via APP - Carteira Digital (Movile Pay)")).toBe(
      "Carteira digital",
    );
    expect(normalizePaymentMethod("Pix")).toBe("Pix");
    expect(normalizePaymentMethod("Débito (Visa)")).toBe("Débito");
    expect(normalizePaymentMethod("App do Banco")).toBe("App do banco");
    expect(normalizePaymentMethod("")).toBe("Outros");
    expect(normalizePaymentMethod(null)).toBe("Outros");
  });
});

describe("buildIfoodTiming", () => {
  it("conta dia/hora pelo horário LOCAL (lido em UTC) e acha o pico", () => {
    // 2026-03-01 é domingo. 21:40 UTC = hora local original do relatório.
    const t = buildIfoodTiming([
      { orderedAt: "2026-03-01T21:40:00.000Z", paymentMethod: "Pix" },
      { orderedAt: "2026-03-01T21:10:00.000Z", paymentMethod: "Crédito" },
      { orderedAt: "2026-03-02T12:00:00.000Z", paymentMethod: "Pix" }, // segunda
    ]);
    const dom = t.byWeekday.find((w) => w.day === "Dom")!;
    const seg = t.byWeekday.find((w) => w.day === "Seg")!;
    expect(dom.orders).toBe(2);
    expect(seg.orders).toBe(1);
    expect(t.peakWeekday).toBe("Dom");
    expect(t.byHour[21].orders).toBe(2);
    expect(t.peakHour).toBe(21);
  });

  it("mix de pagamento ordenado por volume", () => {
    const t = buildIfoodTiming([
      { orderedAt: "2026-03-01T10:00:00.000Z", paymentMethod: "Pix" },
      { orderedAt: "2026-03-01T11:00:00.000Z", paymentMethod: "Pgto via APP - Crédito (Visa)" },
      { orderedAt: "2026-03-01T12:00:00.000Z", paymentMethod: "Pix" },
    ]);
    expect(t.paymentMix[0]).toEqual({ label: "Pix", orders: 2 });
    expect(t.paymentMix[1]).toEqual({ label: "Crédito", orders: 1 });
  });

  it("vazio → picos null", () => {
    const t = buildIfoodTiming([]);
    expect(t.peakWeekday).toBeNull();
    expect(t.peakHour).toBeNull();
    expect(t.paymentMix).toHaveLength(0);
  });

  it("ignora data inválida", () => {
    const t = buildIfoodTiming([{ orderedAt: "xx", paymentMethod: "Pix" }]);
    expect(t.peakWeekday).toBeNull();
    expect(t.paymentMix).toHaveLength(0);
  });
});
