import type { ProductCategory } from "@/types/product";

// ── Status da máquina de estado ──────────────────────────────────────────────

export const ORDER_STATUSES = [
  "NOVO",
  "PREPARANDO",
  "PRONTO",
  "A_CAMINHO",
  "ENTREGUE",
  "CANCELADO",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_STATUSES: readonly OrderStatus[] = ["ENTREGUE", "CANCELADO"] as const;

/** Retorna true se o status não permite mais transições. */
export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Valida se a transição `from → to` é permitida pela máquina de estado.
 *
 * Fluxo principal: NOVO → PREPARANDO → PRONTO → A_CAMINHO → ENTREGUE
 * Cancelamento:    NOVO | PREPARANDO | PRONTO → CANCELADO (obriga motivo)
 */
export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
    NOVO: ["PREPARANDO", "CANCELADO"],
    PREPARANDO: ["PRONTO", "CANCELADO"],
    PRONTO: ["A_CAMINHO", "CANCELADO"],
    A_CAMINHO: ["ENTREGUE"],
    ENTREGUE: [],
    CANCELADO: [],
  };
  return transitions[from].includes(to);
}

// ── Sub-tipos ─────────────────────────────────────────────────────────────────

export type PaymentStatus = "PENDENTE" | "PAGO" | "ESTORNADO";

export type ShippingAddress = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  /** Latitude para cálculo haversine. Preenchida após geocodagem. */
  lat?: number;
  /** Longitude para cálculo haversine. Preenchida após geocodagem. */
  lng?: number;
};

export type OrderItem = {
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  qty: number;
  unitPriceSite: number;
  unitPriceIfood: number;
  /** Observação do cliente para esse item ("sem cobertura", "embrulhar"). */
  notes?: string;
};

// ── Order v2 ──────────────────────────────────────────────────────────────────

export type Order = {
  id: string;
  /** ISO 8601 — quando o pedido foi criado. */
  createdAt: string;
  /** ISO 8601 — última atualização de status. */
  updatedAt: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;

  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;

  items: OrderItem[];

  subtotal: number;
  shippingFee: number;
  /** Soma dos descontos aplicados (cupom + promoções futuras). */
  discountTotal: number;
  /** subtotal + shippingFee − discountTotal */
  total: number;

  /** Cupom aplicado, se houver. */
  couponApplied?: {
    code: string;
    discountValue: number;
  };

  /** Obrigatório quando status === "CANCELADO". */
  cancelReason?: string;

  /** Canal de origem — usado nas métricas do dashboard. */
  source: "site" | "ifood";

  /** Referência à chamada ao entregador (preenchida em A_CAMINHO). */
  deliveryCallId?: string;

  /**
   * Histórico cronológico de transições de status.
   * Cada entry é adicionada pela store admin a cada `canTransitionTo` bem-sucedido.
   * Usada para derivar timers (quanto tempo em PREPARANDO) e métricas futuras.
   * Inicializada com `[{ status: "NOVO", at: createdAt }]`.
   */
  statusHistory: Array<{ status: OrderStatus; at: string }>;
};
