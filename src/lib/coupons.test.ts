import { describe, it, expect } from "vitest";
import { computeCouponDiscount, isCouponApplicable } from "./coupons";
import type { DiscountableCoupon } from "./coupons";

const mkCoupon = (overrides: Partial<DiscountableCoupon> = {}): DiscountableCoupon => ({
  type: "PERCENTUAL",
  value: 10,
  ...overrides,
});

describe("computeCouponDiscount", () => {
  it("PERCENTUAL aplica % sobre subtotal", () => {
    const c = mkCoupon({ type: "PERCENTUAL", value: 10 });
    expect(computeCouponDiscount(c, { subtotal: 100, shippingFee: 0 })).toBeCloseTo(10);
    expect(computeCouponDiscount(c, { subtotal: 50, shippingFee: 0 })).toBeCloseTo(5);
  });

  it("FIXO desconta valor mas nunca mais que subtotal", () => {
    const c = mkCoupon({ type: "FIXO", value: 5 });
    expect(computeCouponDiscount(c, { subtotal: 100, shippingFee: 0 })).toBe(5);
    expect(computeCouponDiscount(c, { subtotal: 3, shippingFee: 0 })).toBe(3);
  });

  it("FRETE_GRATIS desconta o valor da entrega atual", () => {
    const c = mkCoupon({ type: "FRETE_GRATIS", value: 0 });
    expect(computeCouponDiscount(c, { subtotal: 100, shippingFee: 7 })).toBe(7);
    expect(computeCouponDiscount(c, { subtotal: 100, shippingFee: 0 })).toBe(0);
  });

  it("nunca retorna negativo", () => {
    const c = mkCoupon({ type: "FIXO", value: -5 });
    expect(computeCouponDiscount(c, { subtotal: 100, shippingFee: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe("isCouponApplicable", () => {
  it("falso quando subtotal abaixo do mínimo", () => {
    const c = mkCoupon({ type: "PERCENTUAL", value: 10, minOrderValue: 50 });
    expect(isCouponApplicable(c, { subtotal: 30, shippingFee: 0 })).toBe(false);
  });

  it("verdadeiro quando há desconto efetivo", () => {
    const c = mkCoupon({ type: "PERCENTUAL", value: 10 });
    expect(isCouponApplicable(c, { subtotal: 100, shippingFee: 0 })).toBe(true);
  });

  it("FRETE_GRATIS é falso quando frete já é zero", () => {
    const c = mkCoupon({ type: "FRETE_GRATIS", value: 0 });
    expect(isCouponApplicable(c, { subtotal: 100, shippingFee: 0 })).toBe(false);
  });
});
