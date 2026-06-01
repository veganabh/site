/**
 * Taxas dos canais de venda da Veg.ana + cálculo de margem líquida por canal.
 *
 * Fonte das taxas (validadas com a gestora em 2026-06, doc
 * `Financeiro/dados-custos-precos-2026-06.md`):
 * - **iFood:** 23% comissão + 3,2% pagamento = 26,2% sobre a venda. (A
 *   mensalidade de R$150/mês é custo fixo do canal, NÃO entra no unitário.)
 * - **Site via PIX (AbacatePay):** R$ 0,80 fixo por transação.
 * - **Site via cartão à vista (AbacatePay):** 3,5% + R$ 0,60 por transação.
 *
 * Margem líquida unitária = preço do canal − CPV − taxa do canal.
 * Tudo em REAIS (não centavos) — o componente converte na borda.
 */

export const FEES = {
  /** Comissão + pagamento iFood, fração sobre a venda. */
  ifoodRate: 0.262,
  /** PIX AbacatePay — taxa fixa por transação (R$). */
  pixFixed: 0.8,
  /** Cartão à vista AbacatePay — fração + fixo (R$). */
  cardRate: 0.035,
  cardFixed: 0.6,
} as const;

export type ChannelKey = "ifood" | "pix" | "card";

export type ChannelMargin = {
  channel: ChannelKey;
  /** Lucro líquido por unidade (R$). null se não dá pra calcular (sem CPV). */
  profit: number | null;
  /** Margem sobre o preço do canal (0..1). null se sem CPV ou preço 0. */
  pct: number | null;
};

/**
 * Margem líquida de UM canal. Retorna profit/pct = null quando o custo não
 * foi informado (cost <= 0) — não inventa número.
 */
export function channelMargin(channel: ChannelKey, price: number, cost: number): ChannelMargin {
  if (!(cost > 0) || !(price > 0)) {
    return { channel, profit: null, pct: null };
  }
  const fee =
    channel === "ifood"
      ? price * FEES.ifoodRate
      : channel === "pix"
        ? FEES.pixFixed
        : price * FEES.cardRate + FEES.cardFixed;
  const profit = price - cost - fee;
  return { channel, profit, pct: profit / price };
}

/**
 * Margem nos 3 canais de uma vez. `priceIfood` e `priceSite` em reais; `cost`
 * (CPV) em reais. Site usa o mesmo preço pra PIX e cartão (a diferença é só a
 * taxa).
 */
export function marginByChannel(args: { priceSite: number; priceIfood: number; cost: number }): {
  ifood: ChannelMargin;
  pix: ChannelMargin;
  card: ChannelMargin;
} {
  return {
    ifood: channelMargin("ifood", args.priceIfood, args.cost),
    pix: channelMargin("pix", args.priceSite, args.cost),
    card: channelMargin("card", args.priceSite, args.cost),
  };
}
