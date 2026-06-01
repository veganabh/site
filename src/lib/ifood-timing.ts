/**
 * Pico de pedidos e mix de pagamento do iFood (ADR 0012, P2) — derivado do
 * financeiro por pedido (P1), sem importar relatório novo.
 *
 * IMPORTANTE: `orderedAt` foi gravado em UTC a partir do horário LOCAL (BRT) do
 * relatório (parseDateBR constrói com Date.UTC sobre os campos do relógio). Pra
 * recuperar o dia/hora que o cliente pediu, lemos com getUTC* — não getHours/Day,
 * que aplicariam o fuso do servidor.
 *
 * Funções puras e testáveis.
 */

export const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export type WeekdayCount = { day: string; orders: number };
export type HourCount = { hour: number; orders: number };
export type PaymentSlice = { label: string; orders: number };

export type IfoodTiming = {
  byWeekday: WeekdayCount[];
  byHour: HourCount[];
  peakWeekday: string | null;
  peakHour: number | null;
  maxWeekdayOrders: number;
  maxHourOrders: number;
  paymentMix: PaymentSlice[];
};

const STRIP_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Agrupa o texto bagunçado de pagamento do iFood ("Pgto via APP - Crédito
 * (Mastercard)", "Carteira Digital (Movile Pay)", "App do Banco"…) em poucos
 * baldes. Um pedido pode ter mais de uma forma — classifica pela 1ª que casar.
 */
export function normalizePaymentMethod(value: string | null): string {
  const s = String(value ?? "")
    .normalize("NFD")
    .replace(STRIP_DIACRITICS, "")
    .toLowerCase();
  if (!s.trim()) return "Outros";
  if (s.includes("pix")) return "Pix";
  if (s.includes("credito")) return "Crédito";
  if (s.includes("debito")) return "Débito";
  if (s.includes("carteira")) return "Carteira digital";
  if (s.includes("banco")) return "App do banco";
  if (s.includes("vale") || s.includes("refeicao") || s.includes("alimentacao")) return "Vale";
  return "Outros";
}

export type TimingInput = { orderedAt: string; paymentMethod: string | null };

/** Calcula pico (dia/hora) + mix de pagamento a partir dos pedidos. */
export function buildIfoodTiming(orders: TimingInput[]): IfoodTiming {
  const byWeekday: WeekdayCount[] = WEEKDAY_NAMES.map((day) => ({ day, orders: 0 }));
  const byHour: HourCount[] = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  const payment = new Map<string, number>();

  for (const o of orders) {
    const d = new Date(o.orderedAt);
    if (Number.isNaN(d.getTime())) continue;
    byWeekday[d.getUTCDay()].orders += 1;
    byHour[d.getUTCHours()].orders += 1;
    const bucket = normalizePaymentMethod(o.paymentMethod);
    payment.set(bucket, (payment.get(bucket) ?? 0) + 1);
  }

  let peakWeekday: string | null = null;
  let maxWeekdayOrders = 0;
  for (const w of byWeekday) {
    if (w.orders > maxWeekdayOrders) {
      maxWeekdayOrders = w.orders;
      peakWeekday = w.day;
    }
  }

  let peakHour: number | null = null;
  let maxHourOrders = 0;
  for (const h of byHour) {
    if (h.orders > maxHourOrders) {
      maxHourOrders = h.orders;
      peakHour = h.hour;
    }
  }

  const paymentMix = [...payment.entries()]
    .map(([label, orders]) => ({ label, orders }))
    .sort((a, b) => b.orders - a.orders);

  return {
    byWeekday,
    byHour,
    peakWeekday,
    peakHour,
    maxWeekdayOrders,
    maxHourOrders,
    paymentMix,
  };
}
