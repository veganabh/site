import { create } from "zustand";
import type { CartItem } from "./cart-store";
import type { KitCartItem, GiftKitRecipient } from "@/types/gift-kit";
import { findKitById } from "@/lib/mock-gift-kits";
import { mockProducts } from "@/lib/mock-products";
import { kitLinePrice } from "./cart-store";
import { ORDER_CHANNEL_NAME } from "@/stores/admin-orders-store";
import type { OrderChannelMessage } from "@/stores/admin-orders-store";

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

export type PlacedGiftPick = {
  slotLabel: string;
  productNames: string[];
};

export type PlacedGift = {
  giftId: string;
  orderId: string;
  placedAt: string;
  status: "a-caminho" | "entregue";
  templateId: string;
  templateName: string;
  templateSlug: string;
  coverPhoto: { url: string; alt: string };
  picks: PlacedGiftPick[];
  packaging: boolean;
  cardMessage?: string;
  recipient?: GiftKitRecipient;
  total: number;
};

type OrdersStore = {
  deliveries: PlacedDelivery[];
  gifts: PlacedGift[];
  placeOrder: (items: CartItem[], orderId: string) => void;
  placeGifts: (kits: KitCartItem[], orderId: string) => void;
  markDelivered: (deliveryId: string) => void;
  markGiftDelivered: (giftId: string) => void;
};

export const useOrdersStore = create<OrdersStore>((set) => ({
  deliveries: [],
  gifts: [],

  placeOrder: (items, orderId) =>
    set((state) => {
      if (items.length === 0) return state;
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

  placeGifts: (kits, orderId) =>
    set((state) => {
      if (kits.length === 0) return state;
      const placedGifts: PlacedGift[] = kits.map((kit, idx) => {
        const template = findKitById(kit.templateId);
        const picks: PlacedGiftPick[] = template
          ? template.slots.map((slot) => {
              const pick = kit.picks.find((p) => p.slotId === slot.id);
              const names = (pick?.productIds ?? [])
                .map((id) => mockProducts.find((p) => p.id === id)?.name)
                .filter((n): n is string => Boolean(n));
              return { slotLabel: slot.label, productNames: names };
            })
          : [];
        return {
          giftId: `${orderId}-G${idx + 1}`,
          orderId,
          placedAt: new Date().toISOString(),
          status: "a-caminho" as const,
          templateId: kit.templateId,
          templateName: template?.name ?? "Kit presente",
          templateSlug: template?.slug ?? "",
          coverPhoto: template?.coverPhoto ?? { url: "", alt: "" },
          picks,
          packaging: kit.packaging,
          cardMessage: kit.cardMessage,
          recipient: kit.recipient,
          total: kitLinePrice(kit),
        };
      });
      return { gifts: [...placedGifts, ...state.gifts] };
    }),

  markDelivered: (deliveryId) =>
    set((state) => ({
      deliveries: state.deliveries.map((d) =>
        d.deliveryId === deliveryId ? { ...d, status: "entregue" } : d,
      ),
    })),

  markGiftDelivered: (giftId) =>
    set((state) => ({
      gifts: state.gifts.map((g) => (g.giftId === giftId ? { ...g, status: "entregue" } : g)),
    })),
}));

// ── BroadcastChannel subscriber (consumidor-only) ──────────────────────────
// Escuta mudanças de status publicadas pelo useAdminOrdersStore para manter
// as listas do cliente (PlacedDelivery) sincronizadas na mesma aba/origem.
// NUNCA publica no canal — só escuta.

if (typeof window !== "undefined") {
  const ch = new BroadcastChannel(ORDER_CHANNEL_NAME);
  ch.onmessage = (event: MessageEvent<OrderChannelMessage>) => {
    const msg = event.data;
    if (msg.type !== "order:status-change") return;

    const { orderId, nextStatus } = msg;

    // Mapeia status admin (OrderStatus) para status do cliente (PlacedDelivery)
    if (nextStatus === "A_CAMINHO") {
      useOrdersStore.getState().markDelivered(orderId);
      // "a-caminho" no shape legado — re-abrir com status correto via workaround:
      useOrdersStore.setState((s) => ({
        deliveries: s.deliveries.map((d) =>
          d.deliveryId === orderId ? { ...d, status: "a-caminho" } : d,
        ),
      }));
    } else if (nextStatus === "ENTREGUE") {
      useOrdersStore.getState().markDelivered(orderId);
    }
  };
  // Não fechar — subscriber de longa duração para toda a vida da aba.
}
