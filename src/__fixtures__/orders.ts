import type { OrderStatus, PaymentStatus, ShippingAddress } from "@/types/order";
import type { ProductCategory } from "@/types/product";

/**
 * Fixture restrita a `scripts/seed-orders.ts` e testes (vitest).
 * Fonte runtime: `public.orders` (Supabase) — NÃO importar em código de UI.
 *
 * Shape simplificado: pedidos seed sem `customerId` (D1 = NULL profile_id) e
 * com `productSlug` em vez de UUID — o seed faz lookup pra UUID real (FAIL FAST
 * se algum slug não existir em `public.products`).
 *
 * Cobre os 6 status da máquina de estado pra smoke do kanban.
 */

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

export type OrderFixtureItem = {
  productSlug: string;
  productName: string;
  productCategory: ProductCategory;
  qty: number;
  unitPriceSite: number;
  unitPriceIfood: number;
  notes?: string;
};

export type OrderFixture = {
  /** Status inicial — seed insere já neste estado e populeia `order_status_history`. */
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: OrderFixtureItem[];
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  source: "site" | "ifood";
  cancelReason?: string;
  /** Histórico cronológico — datas relativas a `now()` no seed. Aqui é apenas a sequência. */
  statusSequence: OrderStatus[];
};

export const orderFixtures: readonly OrderFixture[] = [
  {
    status: "NOVO",
    paymentStatus: "PAGO",
    customerName: "Beatriz Santos",
    customerPhone: "(31) 98811-2233",
    shippingAddress: ADDR_SERRA,
    items: [
      {
        productSlug: "bolo-no-pote-brigadeiro",
        productName: "Bolo no Pote — Brigadeiro",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productSlug: "brigadeiro-gourmet",
        productName: "Brigadeiro Gourmet",
        productCategory: "docinho",
        qty: 4,
        unitPriceSite: 6.5,
        unitPriceIfood: 8.5,
        notes: "embrulhar para presente",
      },
    ],
    subtotal: 61.8,
    shippingFee: 5,
    discountTotal: 0,
    total: 66.8,
    source: "site",
    statusSequence: ["NOVO"],
  },

  {
    status: "PREPARANDO",
    paymentStatus: "PAGO",
    customerName: "Ana Ribeiro",
    customerPhone: "(31) 99999-9999",
    shippingAddress: ADDR_SAVASSI,
    items: [
      {
        productSlug: "bolo-no-pote-brigadeiro",
        productName: "Bolo no Pote — Brigadeiro",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productSlug: "bolo-no-pote-ninho-morango",
        productName: "Bolo no Pote — Ninho com Morango",
        productCategory: "bolo-no-pote",
        qty: 1,
        unitPriceSite: 19.9,
        unitPriceIfood: 25.9,
        notes: "embalar para presente",
      },
      {
        productSlug: "brigadeiro-gourmet",
        productName: "Brigadeiro Gourmet",
        productCategory: "docinho",
        qty: 6,
        unitPriceSite: 6.5,
        unitPriceIfood: 8.5,
      },
    ],
    subtotal: 94.7,
    shippingFee: 0,
    discountTotal: 5,
    total: 89.7,
    couponCode: "FRETE0",
    couponDiscount: 5,
    source: "site",
    statusSequence: ["NOVO", "PREPARANDO"],
  },

  {
    status: "PRONTO",
    paymentStatus: "PAGO",
    customerName: "Carlos Lima",
    customerPhone: "(31) 97744-5566",
    shippingAddress: ADDR_FUNCIONARIOS,
    items: [
      {
        productSlug: "bolo-no-pote-prestigio",
        productName: "Bolo no Pote — Prestígio",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 17.9,
        unitPriceIfood: 23.3,
      },
      {
        productSlug: "bombom-brigadeiro",
        productName: "Bombom de Brigadeiro",
        productCategory: "docinho",
        qty: 1,
        unitPriceSite: 7,
        unitPriceIfood: 9.1,
      },
    ],
    subtotal: 42.8,
    shippingFee: 3,
    discountTotal: 0,
    total: 45.8,
    source: "site",
    statusSequence: ["NOVO", "PREPARANDO", "PRONTO"],
  },

  {
    status: "A_CAMINHO",
    paymentStatus: "PAGO",
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
        productSlug: "bolo-cenoura-cobertura",
        productName: "Bolo de Cenoura com Brigadeiro",
        productCategory: "bolo",
        qty: 1,
        unitPriceSite: 11.9,
        unitPriceIfood: 15.5,
      },
      {
        productSlug: "brownie-chocolate",
        productName: "Brownie de Chocolate",
        productCategory: "bolo",
        qty: 4,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
    ],
    subtotal: 87.5,
    shippingFee: 5,
    discountTotal: 0,
    total: 92.5,
    source: "site",
    statusSequence: ["NOVO", "PREPARANDO", "PRONTO", "A_CAMINHO"],
  },

  {
    status: "ENTREGUE",
    paymentStatus: "PAGO",
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
        productSlug: "bolo-cenoura-cobertura",
        productName: "Bolo de Cenoura com Brigadeiro",
        productCategory: "bolo",
        qty: 1,
        unitPriceSite: 11.9,
        unitPriceIfood: 15.5,
      },
      {
        productSlug: "brownie-chocolate",
        productName: "Brownie de Chocolate",
        productCategory: "bolo",
        qty: 4,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
      {
        productSlug: "bolo-no-pote-limao",
        productName: "Bolo no Pote — Limão Siciliano",
        productCategory: "bolo-no-pote",
        qty: 2,
        unitPriceSite: 18.9,
        unitPriceIfood: 24.6,
      },
    ],
    subtotal: 125.3,
    shippingFee: 0,
    discountTotal: 0,
    total: 125.3,
    source: "ifood",
    statusSequence: ["NOVO", "PREPARANDO", "PRONTO", "A_CAMINHO", "ENTREGUE"],
  },

  {
    status: "CANCELADO",
    paymentStatus: "ESTORNADO",
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
        productSlug: "bolo-no-pote-brigadeiro",
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
    statusSequence: ["NOVO", "CANCELADO"],
  },
] as const;
