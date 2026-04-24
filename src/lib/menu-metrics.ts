/**
 * menu-metrics.ts — funções puras de métricas para o painel de cardápio.
 *
 * Usado no strip de KPIs acima da lista de produtos.
 * Quando Supabase for integrado, as funções continuam puras — muda só a fonte dos dados.
 */

import type { Product } from "@/types/product";

export type MenuMetrics = {
  /** Total de produtos cadastrados. */
  total: number;
  /** Produtos com active === true. */
  activeCount: number;
  /** Produtos com stock === 0. */
  exhaustedCount: number;
  /** Produtos com 0 < stock ≤ lowStockThreshold. */
  lowStockCount: number;
  /** Soma total de unidades em estoque (todos os produtos). */
  totalStockUnits: number;
  /** Valor em estoque: Σ (price_site × stock) de produtos ativos. */
  stockValue: number;
};

export function calcMenuMetrics(products: Product[]): MenuMetrics {
  let activeCount = 0;
  let exhaustedCount = 0;
  let lowStockCount = 0;
  let totalStockUnits = 0;
  let stockValue = 0;

  for (const p of products) {
    if (p.active) activeCount++;
    if (p.stock === 0) exhaustedCount++;
    else if (p.stock <= p.lowStockThreshold) lowStockCount++;
    totalStockUnits += p.stock;
    if (p.active) stockValue += p.price_site * p.stock;
  }

  return {
    total: products.length,
    activeCount,
    exhaustedCount,
    lowStockCount,
    totalStockUnits,
    stockValue,
  };
}
