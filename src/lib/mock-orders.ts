import type { Product } from "@/types/product";
import { mockProducts } from "@/lib/mock-products";

export type OrderStatus = "em-preparo" | "a-caminho" | "entregue" | "cancelado";

export type Order = {
  id: string;
  /** Agrupa itens que pertencem à mesma entrega. */
  deliveryId: string;
  productId: Product["id"];
  productName: string;
  productSlug: string;
  productCategory: Product["category"];
  placedAt: string;
  quantity: number;
  priceSite: number;
  priceIfood: number;
  status: OrderStatus;
  customerNote?: string;
};

export type DeliveryGroup = {
  deliveryId: string;
  placedAt: string;
  status: OrderStatus;
  items: Order[];
  total: number;
};

const byId = new Map(mockProducts.map((p) => [p.id, p]));

function buildOrder(
  id: string,
  deliveryId: string,
  productId: string,
  placedAt: string,
  status: OrderStatus,
  quantity = 1,
  customerNote?: string,
): Order {
  const p = byId.get(productId);
  if (!p) throw new Error(`mockOrders: produto ${productId} não encontrado`);
  return {
    id,
    deliveryId,
    productId: p.id,
    productName: p.name,
    productSlug: p.slug,
    productCategory: p.category,
    placedAt,
    quantity,
    priceSite: p.price_site,
    priceIfood: p.price_ifood,
    status,
    customerNote,
  };
}

export const mockOrders: readonly Order[] = [
  // Carrinho atual
  buildOrder("o-101", "d-10", "1", "2026-04-19 14:20", "em-preparo", 2),
  buildOrder("o-102", "d-10", "6", "2026-04-19 14:20", "em-preparo", 1, "embalar para presente"),
  buildOrder("o-103", "d-10", "11", "2026-04-19 14:20", "em-preparo", 6),
  // A caminho
  buildOrder("o-301", "d-09", "2", "2026-04-19 13:45", "a-caminho", 2),
  buildOrder("o-302", "d-09", "5", "2026-04-19 13:45", "a-caminho", 1),
  // Entregue — pedido 1 (3 itens juntos)
  buildOrder("o-201", "d-08", "3", "2026-04-18 19:05", "entregue", 1),
  buildOrder("o-202", "d-08", "4", "2026-04-18 19:05", "entregue", 4),
  buildOrder("o-203", "d-08", "7", "2026-04-18 19:05", "entregue", 2),
  // Entregue — pedido 2 (2 itens)
  buildOrder("o-204", "d-07", "1", "2026-04-15 18:10", "entregue", 1),
  buildOrder("o-205", "d-07", "11", "2026-04-15 18:10", "entregue", 3),
] as const;

export function listOrdersByStatus(
  group: "em-preparo" | "a-caminho" | "entregue" | "cancelado",
): Order[] {
  return mockOrders.filter((o) => o.status === group);
}

export function listDeliveryGroups(status: OrderStatus): DeliveryGroup[] {
  const orders = mockOrders.filter((o) => o.status === status);
  const map = new Map<string, DeliveryGroup>();
  for (const o of orders) {
    if (!map.has(o.deliveryId)) {
      map.set(o.deliveryId, {
        deliveryId: o.deliveryId,
        placedAt: o.placedAt,
        status: o.status,
        items: [],
        total: 0,
      });
    }
    const g = map.get(o.deliveryId)!;
    g.items.push(o);
    g.total += o.priceSite * o.quantity;
  }
  return Array.from(map.values());
}
