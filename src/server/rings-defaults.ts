import "server-only";

/**
 * Valores semente dos 20 anéis (espelha a migration 05 — única fonte da
 * verdade quando admin clica "Restaurar padrões". Inner/outer radius são
 * estruturais e não entram no reset.
 */
export type RingDefault = {
  ring_order: number;
  fee_cents: number;
  eta_min: number;
  eta_max: number;
  active: boolean;
  label: string;
};

export const RING_DEFAULTS: readonly RingDefault[] = [
  { ring_order: 1, fee_cents: 0, eta_min: 30, eta_max: 40, active: true, label: "até 500m" },
  { ring_order: 2, fee_cents: 500, eta_min: 30, eta_max: 45, active: true, label: "500m – 1km" },
  { ring_order: 3, fee_cents: 700, eta_min: 35, eta_max: 50, active: true, label: "1km – 1,5km" },
  { ring_order: 4, fee_cents: 900, eta_min: 35, eta_max: 50, active: true, label: "1,5km – 2km" },
  { ring_order: 5, fee_cents: 1100, eta_min: 40, eta_max: 55, active: true, label: "2km – 2,5km" },
  { ring_order: 6, fee_cents: 1300, eta_min: 40, eta_max: 55, active: true, label: "2,5km – 3km" },
  { ring_order: 7, fee_cents: 1500, eta_min: 45, eta_max: 60, active: true, label: "3km – 3,5km" },
  { ring_order: 8, fee_cents: 1700, eta_min: 45, eta_max: 60, active: true, label: "3,5km – 4km" },
  { ring_order: 9, fee_cents: 1900, eta_min: 50, eta_max: 65, active: true, label: "4km – 4,5km" },
  { ring_order: 10, fee_cents: 2100, eta_min: 50, eta_max: 65, active: true, label: "4,5km – 5km" },
  { ring_order: 11, fee_cents: 2300, eta_min: 55, eta_max: 70, active: true, label: "5km – 5,5km" },
  { ring_order: 12, fee_cents: 2500, eta_min: 55, eta_max: 70, active: true, label: "5,5km – 6km" },
  { ring_order: 13, fee_cents: 2700, eta_min: 60, eta_max: 75, active: true, label: "6km – 6,5km" },
  { ring_order: 14, fee_cents: 2900, eta_min: 60, eta_max: 75, active: true, label: "6,5km – 7km" },
  { ring_order: 15, fee_cents: 3100, eta_min: 65, eta_max: 80, active: true, label: "7km – 7,5km" },
  { ring_order: 16, fee_cents: 3300, eta_min: 65, eta_max: 80, active: true, label: "7,5km – 8km" },
  { ring_order: 17, fee_cents: 3500, eta_min: 70, eta_max: 85, active: false, label: "8km – 8,5km" },
  { ring_order: 18, fee_cents: 3700, eta_min: 70, eta_max: 85, active: false, label: "8,5km – 9km" },
  { ring_order: 19, fee_cents: 3900, eta_min: 75, eta_max: 90, active: false, label: "9km – 9,5km" },
  { ring_order: 20, fee_cents: 4100, eta_min: 75, eta_max: 90, active: false, label: "9,5km – 10km" },
];
