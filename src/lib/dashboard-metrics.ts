/**
 * dashboard-metrics.ts — funções puras de cálculo para o dashboard operacional.
 *
 * Todas as funções são puras (sem side effects, sem IO).
 * Quando Supabase for integrado, substituir as chamadas pelo hook useDashboardMetrics()
 * — a interface de retorno permanece estável.
 */

import type { Order } from "@/types/order";
import type { Product } from "@/types/product";

// ── Helpers de data ──────────────────────────────────────────────────────────

/** Retorna true se o ISO string `at` pertence ao mesmo dia calendário que `date`. */
export function isSameDay(at: string, date: Date): boolean {
  const d = new Date(at);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

/**
 * Retorna saudação pt-BR conforme hora do dia:
 *  - 5h–11h59 → "Bom dia"
 *  - 12h–17h59 → "Boa tarde"
 *  - 18h–4h59 → "Boa noite"
 */
export function greetingFor(date: Date = new Date()): "Bom dia" | "Boa tarde" | "Boa noite" {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Formata diferença de data relativa ("há 2 min", "há 1 h"). */
export function formatRelativeTime(isoString: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

// ── Métricas de atenção imediata ─────────────────────────────────────────────

/** Pedidos em status NOVO (aguardando aceite). */
export function countNewOrders(orders: Order[]): number {
  return orders.filter((o) => o.status === "NOVO").length;
}

/**
 * Pedidos em PREPARANDO há mais de `thresholdMinutes` minutos.
 * Compara a entrada em PREPARANDO (via statusHistory) com `now`.
 */
export function countDelayedOrders(
  orders: Order[],
  thresholdMinutes = 30,
  now: Date = new Date(),
): number {
  return orders.filter((o) => {
    if (o.status !== "PREPARANDO") return false;
    const entry = o.statusHistory.find((h) => h.status === "PREPARANDO");
    if (!entry) return false;
    const elapsed = (now.getTime() - new Date(entry.at).getTime()) / 60_000;
    return elapsed > thresholdMinutes;
  }).length;
}

/** Produtos com estoque crítico (stock > 0 && stock <= lowStockThreshold, ativos). */
export function countLowStockProducts(products: Product[]): number {
  return products.filter((p) => p.active && p.stock > 0 && p.stock <= p.lowStockThreshold).length;
}

// ── Métricas de faturamento do dia ───────────────────────────────────────────

export type DayMetrics = {
  /** Receita total do dia (excluindo cancelados). */
  revenue: number;
  /** Número de pedidos do dia (excluindo cancelados). */
  orderCount: number;
  /** Ticket médio do dia (revenue / orderCount). 0 se orderCount === 0. */
  avgTicket: number;
  /** Número de pedidos cancelados no dia. */
  cancelCount: number;
};

/** Calcula métricas de faturamento para um conjunto de pedidos num dia. */
export function calcDayMetrics(orders: Order[], day: Date): DayMetrics {
  const dayOrders = orders.filter((o) => isSameDay(o.createdAt, day));
  const active = dayOrders.filter((o) => o.status !== "CANCELADO");
  const revenue = active.reduce((acc, o) => acc + o.total, 0);
  const orderCount = active.length;
  const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
  const cancelCount = dayOrders.filter((o) => o.status === "CANCELADO").length;

  return { revenue, orderCount, avgTicket, cancelCount };
}

// ── Métricas operacionais adicionais (usadas em /gestao/pedidos) ──────────────

/**
 * Tempo médio de preparo em minutos (entrada em PREPARANDO → entrada em PRONTO).
 * Considera apenas pedidos do dia que já alcançaram PRONTO, A_CAMINHO ou ENTREGUE.
 * Retorna null se nenhum pedido qualifica (evita "NaN min" na UI).
 */
export function calcAvgPrepMinutes(orders: Order[], day: Date): number | null {
  const dayOrders = orders.filter((o) => isSameDay(o.createdAt, day));
  const durations: number[] = [];

  for (const o of dayOrders) {
    const prepAt = o.statusHistory.find((h) => h.status === "PREPARANDO")?.at;
    const readyAt = o.statusHistory.find((h) => h.status === "PRONTO")?.at;
    if (!prepAt || !readyAt) continue;
    const diff = (new Date(readyAt).getTime() - new Date(prepAt).getTime()) / 60_000;
    if (diff >= 0) durations.push(diff);
  }

  if (durations.length === 0) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

/**
 * Taxa de aceite: proporção de pedidos do dia que chegaram a passar por PREPARANDO,
 * sobre todos os pedidos criados no dia. Mede quantos foram aceitos pela cozinha.
 * Retorna objeto `{ accepted, total }` para permitir UI flexível ("10/11" ou "91%").
 */
export function calcAcceptanceRate(
  orders: Order[],
  day: Date,
): { accepted: number; total: number } {
  const dayOrders = orders.filter((o) => isSameDay(o.createdAt, day));
  const accepted = dayOrders.filter((o) =>
    o.statusHistory.some((h) => h.status === "PREPARANDO"),
  ).length;
  return { accepted, total: dayOrders.length };
}

/** Formata percentual de delta (ex: "+12%", "-5%"). */

export function formatDelta(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "—";
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/** true se delta é positivo. Usado para cor visual. */
export function isDeltaPositive(current: number, previous: number): boolean {
  return current >= previous;
}

// ── Top SKUs ─────────────────────────────────────────────────────────────────

export type SkuStat = {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
};

/**
 * Calcula top N SKUs vendidos num dia específico.
 * Agrega por productId (soma qty e receita dos itens de cada pedido).
 */
export function calcTopSkus(orders: Order[], day: Date, topN = 5): SkuStat[] {
  const dayOrders = orders.filter((o) => isSameDay(o.createdAt, day) && o.status !== "CANCELADO");

  const map = new Map<string, SkuStat>();

  for (const order of dayOrders) {
    for (const item of order.items) {
      const existing = map.get(item.productId);
      const revenue = item.qty * item.unitPriceSite;
      if (existing) {
        existing.qtySold += item.qty;
        existing.revenue += revenue;
      } else {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          qtySold: item.qty,
          revenue,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.qtySold - a.qtySold)
    .slice(0, topN);
}

// ── Feed de pedidos recentes ──────────────────────────────────────────────────

/**
 * Retorna os N pedidos mais recentes (qualquer status), ordenados
 * por createdAt descrescente.
 */
export function getRecentOrders(orders: Order[], limit = 5): Order[] {
  return [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
