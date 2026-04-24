import type { Order, OrderStatus, ShippingAddress } from "@/types/order";

/**
 * Pedidos mock — Order v2.
 *
 * Shape refatorado: um Order = um pedido com N itens (OrderItem[]).
 * Cobre todos os 6 status da máquina de estado para testes visuais completos.
 *
 * Funções `listOrdersByStatus` e `listDeliveryGroups` mantidas com assinatura
 * compatível. `listDeliveryGroups` retorna DeliveryGroup[] adaptado ao novo shape.
 */

// ── Endereço reutilizado nos mocks ────────────────────────────────────────────

const ADDR_SERRA: ShippingAddress = {
  street: "Rua Corinto",
  number: "45",
  neighborhood: "Serra",
  city: "Belo Horizonte",
  state: "MG",
  cep: "30220-310",
};

const ADDR_SAVASSI: ShippingAddress = {
  street: "Rua Pernambuco",
  number: "120",
  complement: "Apto 302",
  neighborhood: "Savassi",
  city: "Belo Horizonte",
  state: "MG",
  cep: "30130-150",
};

const ADDR_FUNCIONARIOS: ShippingAddress = {
  street: "Av. do Contorno",
  number: "5800",
  neighborhood: "Funcionários",
  city: "Belo Horizonte",
  state: "MG",
  cep: "30110-090",
};

// ── Pedidos mock ──────────────────────────────────────────────────────────────

export const mockOrders: readonly Order[] = [
  // ── NOVO — aguardando aceite da admin ──────────────────────────────────────
  {
    id: "d-11",
    createdAt: "2026-04-22T13:50:00.000Z",
    updatedAt: "2026-04-22T13:50:00.000Z",
    status: "NOVO",
    paymentStatus: "PAGO",
    customerId: "cust-beatriz",
    customerName: "Beatriz Santos",
    customerPhone: "(31) 98811-2233",
    shippingAddress: ADDR_SERRA,
    items: [
      {
        productId: "1",
        productName: "Bolo no Pote — Brigadeiro",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productId: "11",
        productName: "Brigadeiro Gourmet",
        productCategory: "docinho",
        qty: 4,
        unitPriceSite: 6.5,
        unitPriceIfood: 8.5,
        notes: "embrulhar para presente",
      },
    ],
    subtotal: 61.8, // 2×17.9 + 4×6.5
    shippingFee: 5,
    discountTotal: 0,
    total: 66.8,
    source: "site",
    statusHistory: [{ status: "NOVO", at: "2026-04-22T13:50:00.000Z" }],
  },

  // ── PREPARANDO — em produção ───────────────────────────────────────────────
  {
    id: "d-10",
    createdAt: "2026-04-22T13:35:00.000Z",
    updatedAt: "2026-04-22T13:37:00.000Z",
    status: "PREPARANDO",
    paymentStatus: "PAGO",
    customerId: "mock-ana",
    customerName: "Ana Ribeiro",
    customerPhone: "(31) 99999-9999",
    shippingAddress: ADDR_SAVASSI,
    items: [
      {
        productId: "1",
        productName: "Bolo no Pote — Brigadeiro",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productId: "6",
        productName: "Bolo no Pote — Ninho com Morango",
        productCategory: "bolo-no-pote",
        qty: 1,
        unitPriceSite: 19.9,
        unitPriceIfood: 25.9,
        notes: "embalar para presente",
      },
      {
        productId: "11",
        productName: "Brigadeiro Gourmet",
        productCategory: "docinho",
        qty: 6,
        unitPriceSite: 6.5,
        unitPriceIfood: 8.5,
      },
    ],
    subtotal: 94.7, // 2×17.9 + 1×19.9 + 6×6.5
    shippingFee: 0,
    discountTotal: 5,
    total: 89.7, // frete grátis (FRETE0) + desconto fixo R$5
    couponApplied: { code: "FRETE0", discountValue: 5 },
    source: "site",
    statusHistory: [
      { status: "NOVO", at: "2026-04-22T13:35:00.000Z" },
      { status: "PREPARANDO", at: "2026-04-22T13:37:00.000Z" },
    ],
  },

  // ── PRONTO — aguardando entregador ─────────────────────────────────────────
  {
    id: "d-09",
    createdAt: "2026-04-22T13:15:00.000Z",
    updatedAt: "2026-04-22T13:45:00.000Z",
    status: "PRONTO",
    paymentStatus: "PAGO",
    customerId: "cust-carlos",
    customerName: "Carlos Lima",
    customerPhone: "(31) 97744-5566",
    shippingAddress: ADDR_FUNCIONARIOS,
    items: [
      {
        productId: "2",
        productName: "Bolo no Pote — Prestígio",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productId: "5",
        productName: "Bombom de Brigadeiro",
        productCategory: "docinho",
        qty: 1,
        unitPriceSite: 7,
        unitPriceIfood: 9.1,
      },
    ],
    subtotal: 42.8, // 2×17.9 + 1×7
    shippingFee: 3,
    discountTotal: 0,
    total: 45.8,
    source: "site",
    statusHistory: [
      { status: "NOVO", at: "2026-04-22T13:15:00.000Z" },
      { status: "PREPARANDO", at: "2026-04-22T13:18:00.000Z" },
      { status: "PRONTO", at: "2026-04-22T13:45:00.000Z" },
    ],
  },

  // ── A_CAMINHO — entregador a caminho ──────────────────────────────────────
  {
    id: "d-08",
    createdAt: "2026-04-22T12:50:00.000Z",
    updatedAt: "2026-04-22T13:20:00.000Z",
    status: "A_CAMINHO",
    paymentStatus: "PAGO",
    customerId: "cust-mariana",
    customerName: "Mariana Ferreira",
    customerPhone: "(31) 96655-4433",
    shippingAddress: {
      street: "Rua Fernandes Tourinho",
      number: "280",
      neighborhood: "Savassi",
      city: "Belo Horizonte",
      state: "MG",
      cep: "30112-000",
    },
    items: [
      {
        productId: "3",
        productName: "Bolo de Cenoura com Brigadeiro",
        productCategory: "bolo",
        qty: 1,
        unitPriceSite: 11.9,
        unitPriceIfood: 15.5,
      },
      {
        productId: "4",
        productName: "Brownie de Chocolate",
        productCategory: "bolo",
        qty: 4,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
    ],
    subtotal: 87.5, // 1×11.9 + 4×18.9
    shippingFee: 5,
    discountTotal: 0,
    total: 92.5,
    source: "site",
    deliveryCallId: "dc-01",
    statusHistory: [
      { status: "NOVO", at: "2026-04-22T12:50:00.000Z" },
      { status: "PREPARANDO", at: "2026-04-22T12:53:00.000Z" },
      { status: "PRONTO", at: "2026-04-22T13:10:00.000Z" },
      { status: "A_CAMINHO", at: "2026-04-22T13:20:00.000Z" },
    ],
  },

  // ── ENTREGUE — histórico (canal próprio) ───────────────────────────────────
  {
    id: "d-07",
    createdAt: "2026-04-21T18:05:00.000Z",
    updatedAt: "2026-04-21T19:10:00.000Z",
    status: "ENTREGUE",
    paymentStatus: "PAGO",
    customerId: "cust-rodrigo",
    customerName: "Rodrigo Costa",
    customerPhone: "(31) 95544-3322",
    shippingAddress: {
      street: "Rua Bárbara Heliodora",
      number: "640",
      neighborhood: "Lourdes",
      city: "Belo Horizonte",
      state: "MG",
      cep: "30140-070",
    },
    items: [
      {
        productId: "3",
        productName: "Bolo de Cenoura com Brigadeiro",
        productCategory: "bolo",
        qty: 1,
        unitPriceSite: 11.9,
        unitPriceIfood: 15.5,
      },
      {
        productId: "4",
        productName: "Brownie de Chocolate",
        productCategory: "bolo",
        qty: 4,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
      {
        productId: "7",
        productName: "Bolo no Pote — Limão Siciliano",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
    ],
    subtotal: 125.3, // 1×11.9 + 4×18.9 + 2×18.9
    shippingFee: 0,
    discountTotal: 0,
    total: 125.3,
    source: "ifood",
    statusHistory: [
      { status: "NOVO", at: "2026-04-21T18:05:00.000Z" },
      { status: "PREPARANDO", at: "2026-04-21T18:08:00.000Z" },
      { status: "PRONTO", at: "2026-04-21T18:45:00.000Z" },
      { status: "A_CAMINHO", at: "2026-04-21T18:55:00.000Z" },
      { status: "ENTREGUE", at: "2026-04-21T19:10:00.000Z" },
    ],
  },

  // ── CANCELADO — recusado ────────────────────────────────────────────────────
  {
    id: "d-06",
    createdAt: "2026-04-22T11:30:00.000Z",
    updatedAt: "2026-04-22T11:32:00.000Z",
    status: "CANCELADO",
    paymentStatus: "ESTORNADO",
    customerId: "cust-juliana",
    customerName: "Juliana Mendes",
    customerPhone: "(31) 94433-2211",
    shippingAddress: {
      street: "Rua Grão Pará",
      number: "999",
      neighborhood: "Santa Efigênia",
      city: "Belo Horizonte",
      state: "MG",
      cep: "30150-340",
    },
    items: [
      {
        productId: "1",
        productName: "Bolo no Pote — Brigadeiro",
        productCategory: "bolo-no-pote",
        qty: 1,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
    ],
    subtotal: 17.9,
    shippingFee: 5,
    discountTotal: 0,
    total: 22.9,
    cancelReason: "Cliente solicitou cancelamento",
    source: "site",
    statusHistory: [
      { status: "NOVO", at: "2026-04-22T11:30:00.000Z" },
      { status: "CANCELADO", at: "2026-04-22T11:32:00.000Z" },
    ],
  },
] as const;

// ── Compat legado — aceita status antigos ("entregue") e novos ("ENTREGUE") ──

/**
 * Aceita tanto o enum novo ("ENTREGUE") quanto o legado ("entregue") para
 * não quebrar os consumers existentes enquanto eles não são migrados.
 */
type StatusParam = OrderStatus | "em-preparo" | "a-caminho" | "entregue" | "cancelado";

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  "em-preparo": "PREPARANDO",
  "a-caminho": "A_CAMINHO",
  entregue: "ENTREGUE",
  cancelado: "CANCELADO",
};

function resolveStatus(raw: StatusParam): OrderStatus {
  return LEGACY_STATUS_MAP[raw] ?? (raw as OrderStatus);
}

// ── Funções de acesso ─────────────────────────────────────────────────────────

export function getOrderById(id: string): Order | undefined {
  return mockOrders.find((o) => o.id === id);
}

export function listOrdersByStatus(status: StatusParam): Order[] {
  const resolved = resolveStatus(status);
  return mockOrders.filter((o) => o.status === resolved);
}

// ── DeliveryGroup — compatibilidade com consumers existentes ──────────────────

/**
 * Item no shape legado — mantém nomes usados pelos componentes de UI existentes
 * (order-detail-panel, conta-dashboard) sem exigir refactor deles agora.
 *
 * Passo 2+ vai migrar esses componentes para consumir OrderItem diretamente.
 * Por enquanto, mapear aqui evita quebrar typecheck.
 */
export type LegacyGroupItem = {
  /** Gerado como `${orderId}-${productId}` para unicidade. */
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  /** Compat com `item.quantity` nos consumers. Alias de OrderItem.qty. */
  quantity: number;
  /** Compat com `item.priceSite`. Alias de OrderItem.unitPriceSite. */
  priceSite: number;
  /** Compat com `item.priceIfood`. Alias de OrderItem.unitPriceIfood. */
  priceIfood: number;
  notes?: string;
};

/**
 * Agrupa orders por status. No novo shape, cada Order já é um grupo de itens,
 * então DeliveryGroup é essencialmente um wrapper de Order para backwards-compat.
 *
 * Consumers que precisam de granularidade por item devem usar `order.items` diretamente.
 * O campo `items` usa LegacyGroupItem para não quebrar componentes existentes.
 */
export type DeliveryGroup = {
  deliveryId: string;
  placedAt: string;
  status: OrderStatus;
  /** Itens com campos legados (quantity, priceSite, priceIfood). */
  items: LegacyGroupItem[];
  total: number;
  /** Referência ao order completo para acesso a campos adicionais. */
  order: Order;
};

export function listDeliveryGroups(status: StatusParam): DeliveryGroup[] {
  const resolved = resolveStatus(status);
  return mockOrders
    .filter((o) => o.status === resolved)
    .map((o) => ({
      deliveryId: o.id,
      placedAt: o.createdAt,
      status: o.status,
      items: o.items.map((item) => ({
        id: `${o.id}-${item.productId}`,
        productId: item.productId,
        productName: item.productName,
        productCategory: item.productCategory,
        quantity: item.qty,
        priceSite: item.unitPriceSite,
        priceIfood: item.unitPriceIfood,
        notes: item.notes,
      })),
      total: o.total,
      order: o,
    }));
}
