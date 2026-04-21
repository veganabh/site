/**
 * Motor de cross-sell dinâmico da Veg.ana.
 *
 * Regra (ADR 0004):
 *   - Um único item sugerido por vez.
 *   - Escala com a faixa de economia acumulada no carrinho.
 *   - Retorna null se o usuário já aceitou uma sugestão nesta sessão.
 *   - O item sugerido é o MAIS CARO dentro do teto da faixa
 *     (incentiva upgrade sem forçar o usuário).
 */

import type { Product } from "@/types/product";

export type CrossSellTier = {
  /** Limite inferior inclusivo (R$). */
  minInclusive: number;
  /** Limite superior exclusivo (R$). Use Infinity para a última faixa. */
  maxExclusive: number;
  /** Preço máximo do item sugerido (R$). */
  priceCap: number;
};

export const CROSS_SELL_TIERS: CrossSellTier[] = [
  { minInclusive: 0, maxExclusive: 8, priceCap: 0 },      // sem sugestão
  { minInclusive: 8, maxExclusive: 15, priceCap: 8 },
  { minInclusive: 15, maxExclusive: 25, priceCap: 15 },
  { minInclusive: 25, maxExclusive: Infinity, priceCap: 25 },
];

/**
 * Retorna o produto sugerido para cross-sell, ou null quando:
 *   - economia < R$8 (primeira faixa, sem sugestão)
 *   - usuário já aceitou uma sugestão nesta sessão (`accepted === true`)
 *   - nenhum produto elegível encontrado
 *
 * @param savings      Economia acumulada no carrinho (price_ifood − price_site × qty)
 * @param products     Lista completa de produtos disponíveis
 * @param cartIds      Set de IDs dos produtos já no carrinho
 * @param accepted     Flag de sessão — true após usuário aceitar sugestão
 */
export function getCrossSellSuggestion(
  savings: number,
  products: readonly Product[],
  cartIds: Set<string>,
  accepted: boolean,
): Product | null {
  if (accepted) return null;
  if (savings < 8) return null;

  const tier = CROSS_SELL_TIERS.find(
    (t) => savings >= t.minInclusive && savings < t.maxExclusive,
  );
  if (!tier || tier.priceCap === 0) return null;

  const candidates = products
    .filter((p) => p.active && !cartIds.has(p.id) && p.price_site <= tier.priceCap)
    .sort((a, b) => b.price_site - a.price_site); // mais caro primeiro

  return candidates[0] ?? null;
}

/**
 * Retorna até `limit` sugestões diversas dentro da economia atual.
 * Usado na página /carrinho onde há espaço para múltiplos upsells.
 *
 * Estratégia: pega produtos ativos, fora do carrinho, com preço ≤ economia,
 * ordena por preço descendente e seleciona `limit` com faixas diferentes
 * (spread entre cheap/mid/max) para não repetir perfil.
 */
export function getCrossSellSuggestions(
  savings: number,
  products: readonly Product[],
  cartIds: Set<string>,
  limit = 3,
): Product[] {
  if (savings < 8) return [];

  const affordable = products
    .filter((p) => p.active && !cartIds.has(p.id) && p.price_site <= savings)
    .sort((a, b) => b.price_site - a.price_site);

  if (affordable.length <= limit) return affordable;

  // Escolhe `limit` em faixas espaçadas para dar variedade de preço
  const step = Math.floor(affordable.length / limit);
  const picks: Product[] = [];
  for (let i = 0; i < limit; i++) {
    picks.push(affordable[i * step]);
  }
  return picks;
}
