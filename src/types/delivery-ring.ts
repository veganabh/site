/**
 * Anel de entrega concêntrico ao ponto de produção da Veg.ana.
 *
 * O mapa de zonas é dividido em 20 anéis de 500m cada (total 10km).
 * A admin pode ativar/desativar anéis em tempo real via /gestao/zonas.
 *
 * Lookup de frete: CEP do cliente → geocodagem → haversine → anel ativo → fee/ETA.
 * Se fora de todos os anéis ativos: "Peça pelo iFood".
 */
export type DeliveryRing = {
  id: string;
  /** Posição do anel, 1-indexado (1 = mais próximo ao centro). */
  order: number;
  /** Raio interno em metros. 0 para o primeiro anel. */
  innerRadiusM: number;
  /** Raio externo em metros. Cresce 500m por anel. */
  outerRadiusM: number;
  /** Taxa de entrega em R$. 0 = grátis. */
  fee: number;
  /** Tempo estimado mínimo em minutos. */
  etaMin: number;
  /** Tempo estimado máximo em minutos. */
  etaMax: number;
  /**
   * Se este anel aceita pedidos no momento.
   * Admin pode desativar temporariamente (ex: congestionamento, feriado).
   */
  active: boolean;
  /** Label de exibição. Ex: "até 500m", "500m–1km", "9,5km–10km". */
  label: string;
};
