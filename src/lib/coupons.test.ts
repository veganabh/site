import { describe, it, expect } from "vitest";
import { validateCoupon, COUPONS_MAP, AVAILABLE_COUPONS } from "./coupons";

describe("validateCoupon", () => {
  it("retorna o cupom para código válido em maiúsculas", () => {
    const coupon = validateCoupon("VEGANA10");
    expect(coupon).not.toBeNull();
    expect(coupon?.code).toBe("VEGANA10");
  });

  it("normaliza código para maiúsculas antes de validar", () => {
    expect(validateCoupon("vegana10")).not.toBeNull();
    expect(validateCoupon("Vegana10")).not.toBeNull();
  });

  it("remove espaços antes de validar", () => {
    expect(validateCoupon("  BEM5  ")).not.toBeNull();
  });

  it("retorna null para código inválido", () => {
    expect(validateCoupon("INVALIDO")).toBeNull();
    expect(validateCoupon("")).toBeNull();
    expect(validateCoupon("VEGANA")).toBeNull();
  });

  it("VEGANA10 desconta 10% do subtotal", () => {
    const coupon = validateCoupon("VEGANA10");
    expect(coupon?.discount(100)).toBeCloseTo(10);
    expect(coupon?.discount(50)).toBeCloseTo(5);
  });

  it("BEM5 desconta R$5 independente do subtotal", () => {
    const coupon = validateCoupon("BEM5");
    expect(coupon?.discount(100)).toBe(5);
    expect(coupon?.discount(20)).toBe(5);
  });

  it("FRETE0 desconta R$0 (frete já grátis)", () => {
    const coupon = validateCoupon("FRETE0");
    expect(coupon?.discount(100)).toBe(0);
  });
});

describe("COUPONS_MAP e AVAILABLE_COUPONS", () => {
  it("AVAILABLE_COUPONS contém todos os cupons do mapa", () => {
    const mapCodes = Object.keys(COUPONS_MAP).sort();
    const listCodes = AVAILABLE_COUPONS.map((c) => c.code).sort();
    expect(listCodes).toEqual(mapCodes);
  });
});
