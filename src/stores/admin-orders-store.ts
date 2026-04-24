"use client";

import { create } from "zustand";
import type { Order, OrderStatus } from "@/types/order";
import { canTransitionTo, isTerminal } from "@/types/order";
import { mockOrders } from "@/lib/mock-orders";
import { getRandomDeliveryPerson } from "@/lib/mock-delivery-persons";

// ── BroadcastChannel types ──────────────────────────────────────────────────

/** Pedido novo chegou. */
type OrderNewMessage = {
  type: "order:new";
  order: Order;
};

/** Status de um pedido mudou. */
type OrderStatusChangeMessage = {
  type: "order:status-change";
  orderId: string;
  prevStatus: OrderStatus;
  nextStatus: OrderStatus;
  /** ISO 8601 */
  at: string;
  cancelReason?: string;
};

export type OrderChannelMessage = OrderNewMessage | OrderStatusChangeMessage;

/** Nome versionado do canal — incrementar para v2 quando o schema mudar incompativelmente. */
export const ORDER_CHANNEL_NAME = "vegana-orders-v1";

// ── Store ──────────────────────────────────────────────────────────────────

type AdminOrdersState = {
  orders: Order[];
  /**
   * Contagem de pedidos novos não reconhecidos.
   * Incrementa a cada `order:new`. Zera ao chamar `acknowledgeOrder`.
   */
  newOrderCount: number;
  /** IDs dos pedidos ainda não reconhecidos (badge vermelho por card). */
  unacknowledgedIds: Set<string>;
};

type AdminOrdersActions = {
  /** Aceita pedido NOVO → PREPARANDO. */
  acceptOrder: (id: string) => void;
  /** Recusa pedido NOVO → CANCELADO (motivo obrigatório). */
  rejectOrder: (id: string, reason: string) => void;
  /** Marca pedido PREPARANDO → PRONTO. */
  markReady: (id: string) => void;
  /**
   * PRONTO → A_CAMINHO.
   * Sorteia um motoqueiro do pool, simula chamada de 2 s, depois publica
   * status-change. O `deliveryCallId` fica disponível no pedido.
   */
  callDelivery: (id: string) => void;
  /** Marca pedido A_CAMINHO → ENTREGUE. */
  markDelivered: (id: string) => void;
  /** Cancela pedido (NOVO | PREPARANDO | PRONTO → CANCELADO). Motivo obrigatório. */
  cancelOrder: (id: string, reason: string) => void;
  /** Zera badge de "novo" para este pedido — chamar ao abrir o drawer. */
  acknowledgeOrder: (id: string) => void;
  /** Computed: orders agrupados por status. */
  ordersByStatus: (status: OrderStatus) => Order[];
  /**
   * Ordinal do pedido para o cliente (1 = primeiro pedido histórico daquela pessoa).
   * Base: `customerPhone` (proxy estável antes de Supabase com ID real).
   * Conta pedidos não-cancelados criados em ou antes do `createdAt` do alvo.
   */
  getCustomerOrderOrdinal: (orderId: string) => number;
};

type AdminOrdersStore = AdminOrdersState & AdminOrdersActions;

// ── Helper: aplica transição de status no array ────────────────────────────

function applyTransition(
  orders: Order[],
  id: string,
  nextStatus: OrderStatus,
  extra?: Partial<Order>,
): Order[] {
  const at = new Date().toISOString();
  return orders.map((o) => {
    if (o.id !== id) return o;
    if (!canTransitionTo(o.status, nextStatus)) return o;
    return {
      ...o,
      ...extra,
      status: nextStatus,
      updatedAt: at,
      statusHistory: [...o.statusHistory, { status: nextStatus, at }],
    };
  });
}

// ── Helper: publica no BroadcastChannel ────────────────────────────────────

function publish(msg: OrderChannelMessage): void {
  try {
    if (typeof window === "undefined") return;
    const ch = new BroadcastChannel(ORDER_CHANNEL_NAME);
    ch.postMessage(msg);
    ch.close();
  } catch {
    // BroadcastChannel não disponível (SSR/ambientes sem suporte) — ignorar silenciosamente.
  }
}

// ── Store Zustand ──────────────────────────────────────────────────────────

export const useAdminOrdersStore = create<AdminOrdersStore>((set, get) => ({
  // Estado inicial com os mocks do Passo 1
  orders: [...mockOrders],
  newOrderCount: 0,
  unacknowledgedIds: new Set<string>(),

  ordersByStatus: (status) => get().orders.filter((o) => o.status === status),

  acceptOrder: (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order || !canTransitionTo(order.status, "PREPARANDO")) return;

    const at = new Date().toISOString();
    set((s) => ({
      orders: applyTransition(s.orders, id, "PREPARANDO"),
    }));
    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "PREPARANDO",
      at,
    });
  },

  rejectOrder: (id, reason) => {
    if (!reason.trim()) return;
    const order = get().orders.find((o) => o.id === id);
    if (!order || !canTransitionTo(order.status, "CANCELADO")) return;

    const at = new Date().toISOString();
    set((s) => ({
      orders: applyTransition(s.orders, id, "CANCELADO", { cancelReason: reason }),
    }));
    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "CANCELADO",
      at,
      cancelReason: reason,
    });
  },

  markReady: (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order || !canTransitionTo(order.status, "PRONTO")) return;

    const at = new Date().toISOString();
    set((s) => ({ orders: applyTransition(s.orders, id, "PRONTO") }));
    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "PRONTO",
      at,
    });
  },

  callDelivery: (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order || !canTransitionTo(order.status, "A_CAMINHO")) return;

    const person = getRandomDeliveryPerson();

    // Simula latência da chamada à API de WhatsApp (2 s)
    setTimeout(() => {
      const at = new Date().toISOString();
      set((s) => ({
        orders: applyTransition(s.orders, id, "A_CAMINHO", {
          deliveryCallId: person.id,
        }),
      }));
      publish({
        type: "order:status-change",
        orderId: id,
        prevStatus: "PRONTO",
        nextStatus: "A_CAMINHO",
        at,
      });
    }, 2000);
  },

  markDelivered: (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order || !canTransitionTo(order.status, "ENTREGUE")) return;

    const at = new Date().toISOString();
    set((s) => ({ orders: applyTransition(s.orders, id, "ENTREGUE") }));
    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "ENTREGUE",
      at,
    });
  },

  cancelOrder: (id, reason) => {
    if (!reason.trim()) return;
    const order = get().orders.find((o) => o.id === id);
    if (!order || isTerminal(order.status)) return;
    if (!canTransitionTo(order.status, "CANCELADO")) return;

    const at = new Date().toISOString();
    set((s) => ({
      orders: applyTransition(s.orders, id, "CANCELADO", { cancelReason: reason }),
    }));
    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "CANCELADO",
      at,
      cancelReason: reason,
    });
  },

  acknowledgeOrder: (id) => {
    set((s) => {
      const next = new Set(s.unacknowledgedIds);
      const wasUnacknowledged = next.delete(id);
      return {
        unacknowledgedIds: next,
        newOrderCount: wasUnacknowledged ? Math.max(0, s.newOrderCount - 1) : s.newOrderCount,
      };
    });
  },

  getCustomerOrderOrdinal: (orderId) => {
    const target = get().orders.find((o) => o.id === orderId);
    if (!target) return 0;
    const targetAt = new Date(target.createdAt).getTime();
    return get().orders.filter(
      (o) =>
        o.customerPhone === target.customerPhone &&
        o.status !== "CANCELADO" &&
        new Date(o.createdAt).getTime() <= targetAt,
    ).length;
  },
}));
