/**
 * zones-metrics.ts — funções puras de métricas para o painel de zonas de entrega.
 *
 * Usado no strip de KPIs acima do mapa. Derivado dos `DeliveryRing` do store.
 */

import type { DeliveryRing } from "@/types/delivery-ring";

export type ZonesMetrics = {
  /** Total de anéis cadastrados. */
  total: number;
  /** Anéis com active === true. */
  activeCount: number;
  /** Raio máximo de atendimento (outerRadiusM do anel ativo mais externo), em metros. 0 se nenhum ativo. */
  maxRadiusM: number;
  /** Taxa média (R$) dos anéis ativos. 0 se nenhum ativo. */
  avgFee: number;
  /** ETA médio em minutos (média de (etaMin+etaMax)/2 dos ativos). 0 se nenhum ativo. */
  avgEtaMin: number;
  /** Percentual de anéis ativos sobre total. 0-100. */
  coveragePct: number;
};

export function calcZonesMetrics(rings: DeliveryRing[]): ZonesMetrics {
  const active = rings.filter((r) => r.active);

  const maxRadiusM = active.reduce((max, r) => Math.max(max, r.outerRadiusM), 0);
  const avgFee =
    active.length === 0 ? 0 : active.reduce((s, r) => s + r.fee, 0) / active.length;
  const avgEtaMin =
    active.length === 0
      ? 0
      : active.reduce((s, r) => s + (r.etaMin + r.etaMax) / 2, 0) / active.length;
  const coveragePct =
    rings.length === 0 ? 0 : Math.round((active.length / rings.length) * 100);

  return {
    total: rings.length,
    activeCount: active.length,
    maxRadiusM,
    avgFee,
    avgEtaMin,
    coveragePct,
  };
}

/** Formata raio em "X,Ykm" ou "Xm" quando < 1000m. */
export function formatRadius(meters: number): string {
  if (meters === 0) return "—";
  if (meters < 1000) return `${meters}m`;
  const km = meters / 1000;
  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}km`;
}
