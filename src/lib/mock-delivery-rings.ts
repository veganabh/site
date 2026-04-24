import type { DeliveryRing } from "@/types/delivery-ring";

/**
 * 20 anéis concêntricos de 500m cada, partindo do ponto de produção (Serra, BH).
 *
 * Anéis 1–8 (até 4km): active=true — cobertos no lançamento.
 * Anéis 9–20 (4km–10km): active=false — desativados por padrão, admin habilita conforme demanda.
 *
 * Taxas e ETAs são estimativas — admin ajusta via /gestao/zonas.
 */

type RingConfig = {
  fee: number;
  etaMin: number;
  etaMax: number;
  active: boolean;
};

function ringConfig(order: number): RingConfig {
  if (order === 1) return { fee: 0, etaMin: 15, etaMax: 20, active: true };
  if (order <= 3) return { fee: 3, etaMin: 20, etaMax: 30, active: true };
  if (order <= 6) return { fee: 5, etaMin: 25, etaMax: 40, active: true };
  if (order <= 8) return { fee: 7, etaMin: 35, etaMax: 50, active: true };
  if (order <= 12) return { fee: 10, etaMin: 50, etaMax: 70, active: false };
  return { fee: 13, etaMin: 65, etaMax: 90, active: false };
}

function buildLabel(innerM: number, outerM: number): string {
  if (innerM === 0) return "até 500m";

  function fmt(m: number): string {
    if (m < 1000) return `${m}m`;
    const km = m / 1000;
    return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`;
  }

  return `${fmt(innerM)}–${fmt(outerM)}`;
}

function buildRings(): readonly DeliveryRing[] {
  const rings: DeliveryRing[] = [];
  for (let i = 1; i <= 20; i++) {
    const innerRadiusM = (i - 1) * 500;
    const outerRadiusM = i * 500;
    const cfg = ringConfig(i);
    rings.push({
      id: `ring-${i.toString().padStart(2, "0")}`,
      order: i,
      innerRadiusM,
      outerRadiusM,
      fee: cfg.fee,
      etaMin: cfg.etaMin,
      etaMax: cfg.etaMax,
      active: cfg.active,
      label: buildLabel(innerRadiusM, outerRadiusM),
    });
  }
  return rings as readonly DeliveryRing[];
}

export const MOCK_DELIVERY_RINGS: readonly DeliveryRing[] = buildRings();
