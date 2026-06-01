import { describe, it, expect } from "vitest";
import { sortSoldOutLast } from "./product-sort";
import type { Product } from "@/types/product";

function p(id: string, stock: number): Product {
  return { id, name: id, stock } as Product;
}

describe("sortSoldOutLast", () => {
  it("manda esgotados (stock 0) pro fim", () => {
    const out = sortSoldOutLast([p("a", 0), p("b", 5), p("c", 0), p("d", 2)]);
    expect(out.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("é estável: preserva a ordem dentro de cada grupo", () => {
    const out = sortSoldOutLast([p("a", 3), p("b", 1), p("c", 9)]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("não muta o array original", () => {
    const input = [p("a", 0), p("b", 5)];
    sortSoldOutLast(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("tudo disponível ou tudo esgotado → ordem intacta", () => {
    expect(sortSoldOutLast([p("a", 1), p("b", 2)]).map((x) => x.id)).toEqual(["a", "b"]);
    expect(sortSoldOutLast([p("a", 0), p("b", 0)]).map((x) => x.id)).toEqual(["a", "b"]);
  });
});
