import type { GiftKitTemplate } from "@/types/gift-kit";

/**
 * Métricas agregadas dos kits de presente — alimentam a strip de gestão
 * (`kits-stats-strip`). Cálculo puro sobre o catálogo em memória; volume
 * baixo (poucos kits), recompute trivial.
 */
export type KitsMetrics = {
  /** Quantos kits estão visíveis ao público (active = true). */
  activeCount: number;
  /** Quantos kits estão ocultos (active = false). */
  inactiveCount: number;
  /** Total de kits cadastrados. */
  total: number;
  /** Economia média oferecida vs iFood (anchor − price), em reais. */
  avgEconomy: number;
  /** Ticket médio dos kits (preço de venda no site), em reais. */
  avgTicket: number;
  /** Menor preço de kit, em reais. 0 se não há kits. */
  minPrice: number;
  /** Maior preço de kit, em reais. 0 se não há kits. */
  maxPrice: number;
};

/**
 * Agrega o catálogo de kits em métricas de gestão. Médias calculadas sobre
 * TODOS os kits cadastrados (visão de catálogo), não só os ativos.
 */
export function calcKitsMetrics(kits: GiftKitTemplate[]): KitsMetrics {
  const total = kits.length;

  if (total === 0) {
    return {
      activeCount: 0,
      inactiveCount: 0,
      total: 0,
      avgEconomy: 0,
      avgTicket: 0,
      minPrice: 0,
      maxPrice: 0,
    };
  }

  const activeCount = kits.filter((k) => k.active).length;
  const sumEconomy = kits.reduce((acc, k) => acc + (k.priceIfoodAnchor - k.price), 0);
  const sumTicket = kits.reduce((acc, k) => acc + k.price, 0);
  const prices = kits.map((k) => k.price);

  return {
    activeCount,
    inactiveCount: total - activeCount,
    total,
    avgEconomy: sumEconomy / total,
    avgTicket: sumTicket / total,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}
