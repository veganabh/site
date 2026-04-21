import { create } from "zustand";
import type { CartItem } from "./cart-store";

export type PlacedItem = {
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  priceSite: number;
  priceIfood: number;
  photo: { url: string; alt: string };
};

export type PlacedDelivery = {
  deliveryId: string;
  placedAt: string;
  status: "a-caminho" | "entregue";
  items: PlacedItem[];
  total: number;
};

type OrdersStore = {
  deliveries: PlacedDelivery[];
  placeOrder: (items: CartItem[], orderId: string) => void;
  markDelivered: (deliveryId: string) => void;
};

export const useOrdersStore = create<OrdersStore>((set) => ({
  deliveries: [],

  placeOrder: (items, orderId) =>
    set((state) => {
      const placedItems: PlacedItem[] = items.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        productSlug: i.product.slug,
        quantity: i.quantity,
        priceSite: i.product.price_site,
        priceIfood: i.product.price_ifood,
        photo: i.product.photo,
      }));
      const delivery: PlacedDelivery = {
        deliveryId: orderId,
        placedAt: new Date().toISOString(),
        status: "a-caminho",
        items: placedItems,
        total: placedItems.reduce((acc, i) => acc + i.priceSite * i.quantity, 0),
      };
      return { deliveries: [delivery, ...state.deliveries] };
    }),

  markDelivered: (deliveryId) =>
    set((state) => ({
      deliveries: state.deliveries.map((d) =>
        d.deliveryId === deliveryId ? { ...d, status: "entregue" } : d,
      ),
    })),
}));
