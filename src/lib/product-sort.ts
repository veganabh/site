import type { Product } from "@/types/product";

/**
 * Joga os produtos esgotados (stock 0) pro fim da lista, preservando a ordem
 * relativa de cada grupo (sort estável). Itens disponíveis mantêm a ordem que
 * veio do catálogo/coleção; esgotados aparecem por último — sinalizando que
 * dá pra encomendar pra uma data futura (visual em `ProductCardPhoto`).
 */
export function sortSoldOutLast(products: Product[]): Product[] {
  return [...products].sort((a, b) => Number(a.stock === 0) - Number(b.stock === 0));
}
