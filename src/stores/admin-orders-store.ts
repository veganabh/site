"use client";

import { create } from "zustand";
import type { Order, OrderStatus } from "@/types/order";
import { canTransitionTo, isTerminal } from "@/types/order";
import { useDeliveryPersonsStore } from "@/stores/delivery-persons-store";
import {
  acceptOrderAction,
  rejectOrderAction,
  markOrderReadyAction,
  callOrderDeliveryAction,
  markOrderDeliveredAction,
  cancelOrderAction,
  type OrderActionResult,
} from "@/server/actions/orders";

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
  /**
   * Hidrata orders do servidor (chamado pelo `AdminOrdersStoreHydrator` no
   * mount + a cada SSR re-render). Usar ref-comparison para evitar overwrite
   * de estado otimista.
   */
  hydrateOrders: (orders: Order[]) => void;
  /** Aceita pedido NOVO → PREPARANDO. */
  acceptOrder: (id: string) => Promise<OrderActionResult>;
  /** Recusa pedido NOVO → CANCELADO (motivo obrigatório). */
  rejectOrder: (id: string, reason: string) => Promise<OrderActionResult>;
  /** Marca pedido PREPARANDO → PRONTO. */
  markReady: (id: string) => Promise<OrderActionResult>;
  /**
   * PRONTO → A_CAMINHO.
   * Sorteia um motoqueiro do pool (ainda em mock — migração própria) e
   * registra `delivery_call_id` no pedido via server action.
   */
  callDelivery: (id: string) => Promise<OrderActionResult>;
  /** Marca pedido A_CAMINHO → ENTREGUE. */
  markDelivered: (id: string) => Promise<OrderActionResult>;
  /** Cancela pedido (NOVO | PREPARANDO | PRONTO → CANCELADO). Motivo obrigatório. */
  cancelOrder: (id: string, reason: string) => Promise<OrderActionResult>;
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Aplica transição otimista no array local. */
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

/** Publica no BroadcastChannel para sincronizar abas/cliente-store. */
function publish(msg: OrderChannelMessage): void {
  try {
    if (typeof window === "undefined") return;
    const ch = new BroadcastChannel(ORDER_CHANNEL_NAME);
    ch.postMessage(msg);
    ch.close();
  } catch {
    // BroadcastChannel não disponível (SSR/ambientes sem suporte) — ignorar.
  }
}

// ── Store Zustand ──────────────────────────────────────────────────────────

export const useAdminOrdersStore = create<AdminOrdersStore>((set, get) => ({
  orders: [],
  newOrderCount: 0,
  unacknowledgedIds: new Set<string>(),

  hydrateOrders: (orders) => set({ orders }),

  ordersByStatus: (status) => get().orders.filter((o) => o.status === status),

  acceptOrder: async (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (!canTransitionTo(order.status, "PREPARANDO")) {
      return { ok: false, message: "Transição inválida." };
    }

    const prevOrders = get().orders;
    set({ orders: applyTransition(prevOrders, id, "PREPARANDO") });

    const result = await acceptOrderAction(id);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "PREPARANDO",
      at: new Date().toISOString(),
    });
    return result;
  },

  rejectOrder: async (id, reason) => {
    if (!reason.trim()) return { ok: false, message: "Motivo obrigatório." };
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (!canTransitionTo(order.status, "CANCELADO")) {
      return { ok: false, message: "Transição inválida." };
    }

    const prevOrders = get().orders;
    set({
      orders: applyTransition(prevOrders, id, "CANCELADO", { cancelReason: reason }),
    });

    const result = await rejectOrderAction(id, reason);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "CANCELADO",
      at: new Date().toISOString(),
      cancelReason: reason,
    });
    return result;
  },

  markReady: async (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (!canTransitionTo(order.status, "PRONTO")) {
      return { ok: false, message: "Transição inválida." };
    }

    const prevOrders = get().orders;
    set({ orders: applyTransition(prevOrders, id, "PRONTO") });

    const result = await markOrderReadyAction(id);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "PRONTO",
      at: new Date().toISOString(),
    });
    return result;
  },

  callDelivery: async (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (!canTransitionTo(order.status, "A_CAMINHO")) {
      return { ok: false, message: "Transição inválida." };
    }

    const person = useDeliveryPersonsStore.getState().pickRandom();
    if (!person) {
      return { ok: false, message: "Nenhum entregador ativo cadastrado." };
    }
    const prevOrders = get().orders;
    set({
      orders: applyTransition(prevOrders, id, "A_CAMINHO", {
        deliveryCallId: person.id,
      }),
    });

    const result = await callOrderDeliveryAction(id, person.id);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "A_CAMINHO",
      at: new Date().toISOString(),
    });
    return result;
  },

  markDelivered: async (id) => {
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (!canTransitionTo(order.status, "ENTREGUE")) {
      return { ok: false, message: "Transição inválida." };
    }

    const prevOrders = get().orders;
    set({ orders: applyTransition(prevOrders, id, "ENTREGUE") });

    const result = await markOrderDeliveredAction(id);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "ENTREGUE",
      at: new Date().toISOString(),
    });
    return result;
  },

  cancelOrder: async (id, reason) => {
    if (!reason.trim()) return { ok: false, message: "Motivo obrigatório." };
    const order = get().orders.find((o) => o.id === id);
    if (!order) return { ok: false, message: "Pedido não encontrado." };
    if (isTerminal(order.status)) {
      return { ok: false, message: "Pedido já em estado terminal." };
    }
    if (!canTransitionTo(order.status, "CANCELADO")) {
      return { ok: false, message: "Transição inválida." };
    }

    const prevOrders = get().orders;
    set({
      orders: applyTransition(prevOrders, id, "CANCELADO", { cancelReason: reason }),
    });

    const result = await cancelOrderAction(id, reason);
    if (!result.ok) {
      set({ orders: prevOrders });
      return result;
    }

    publish({
      type: "order:status-change",
      orderId: id,
      prevStatus: order.status,
      nextStatus: "CANCELADO",
      at: new Date().toISOString(),
      cancelReason: reason,
    });
    return result;
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
