/**
 * Tipos de configuração operacional da loja. Compartilhados entre o server
 * (leitura de store_settings) e o client (admin-settings-store).
 */

export type StoreStatus = "ATIVO" | "PAUSADO";

export type DayHours = {
  open: boolean;
  /** "HH:MM" */
  from: string;
  /** "HH:MM" */
  to: string;
};

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeekHours = Record<WeekDay, DayHours>;

export type PreorderSettings = {
  /** Dias mínimos de antecedência para encomenda. */
  minLeadDays: number;
  /** Dias máximos de antecedência para encomenda. */
  maxLeadDays: number;
  /** Valor mínimo do pedido de encomenda (reais). */
  minValueCents: number;
  /** Capacidade máxima de encomendas por dia. null = ilimitado. */
  dailyCapacity: number | null;
  /** Hora inicial (0–23) da janela de entrega. */
  hourFrom: number;
  /** Hora final (0–23) da janela de entrega. */
  hourTo: number;
};

export type AdminSettings = {
  storeStatus: StoreStatus;
  hours: WeekHours;
  printerEnabled: boolean;
  printerName: string;
  /** Auto-aceitar: pedido pago entra direto em PREPARANDO (true) vs NOVO (false). */
  autoAccept: boolean;
  /** Configurações de encomendas (ADR 0013). */
  preorder: PreorderSettings;
};

export const SEED_HOURS: WeekHours = {
  mon: { open: false, from: "09:00", to: "19:00" },
  tue: { open: true, from: "09:00", to: "19:00" },
  wed: { open: true, from: "09:00", to: "19:00" },
  thu: { open: true, from: "09:00", to: "19:00" },
  fri: { open: true, from: "09:00", to: "19:00" },
  sat: { open: true, from: "10:00", to: "18:00" },
  sun: { open: true, from: "11:00", to: "17:00" },
};

export const SEED_PREORDER: PreorderSettings = {
  minLeadDays: 3,
  maxLeadDays: 60,
  minValueCents: 10000,
  dailyCapacity: null,
  hourFrom: 9,
  hourTo: 18,
};

export const SEED_SETTINGS: AdminSettings = {
  storeStatus: "ATIVO",
  hours: SEED_HOURS,
  printerEnabled: false,
  printerName: "",
  autoAccept: false,
  preorder: SEED_PREORDER,
};

/** Dia da semana atual no formato WeekDay. */
export function currentWeekDay(date = new Date()): WeekDay {
  const days: WeekDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getDay()];
}

/**
 * Loja aberta = status ATIVO E dentro do horário do dia atual.
 * Status PAUSADO fecha independente do horário.
 */
export function isStoreOpen(
  settings: Pick<AdminSettings, "storeStatus" | "hours">,
  now = new Date(),
): boolean {
  if (settings.storeStatus !== "ATIVO") return false;
  const day = settings.hours[currentWeekDay(now)];
  if (!day?.open) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= day.from && hhmm < day.to;
}
