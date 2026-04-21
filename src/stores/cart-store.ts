import { create } from "zustand";
import type { Product } from "@/types/product";
import { validateCoupon } from "@/lib/coupons";
import type { Coupon } from "@/lib/coupons";

export type CartItem = {
  product: Product;
  quantity: number;
  /**
   * true quando o item entrou no carrinho via aceite de cross-sell
   * (brinde da economia). Badge celebrativo no card.
   */
  fromCrossSell?: boolean;
};

type CartStore = {
  items: CartItem[];

  /** Cupom aplicado no momento. null = sem cupom. */
  appliedCoupon: Coupon | null;

  /**
   * @deprecated Mantido temporariamente para compat. Solução 2:
   * sugestões recomputadas live em /carrinho — não há flag de sessão.
   */
  crossSellAccepted: boolean;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  /**
   * Aplica um cupom pelo código (case-insensitive).
   * Retorna true se válido e aplicado, false se inválido.
   */
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;

  /**
   * Aceita uma sugestão de cross-sell: adiciona o produto ao carrinho
   * marcado como fromCrossSell = true (brinde da economia).
   */
  acceptCrossSell: (product: Product) => void;
};

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  appliedCoupon: null,
  crossSellAccepted: false,

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

  updateQty: (productId, qty) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i,
      ),
    })),

  clearCart: () => set({ items: [], appliedCoupon: null, crossSellAccepted: false }),

  applyCoupon: (code) => {
    const coupon = validateCoupon(code);
    if (!coupon) return false;
    set({ appliedCoupon: coupon });
    return true;
  },

  removeCoupon: () => set({ appliedCoupon: null }),

  acceptCrossSell: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      const updatedItems = existing
        ? state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1, fromCrossSell: true }
              : i,
          )
        : [...state.items, { product, quantity: 1, fromCrossSell: true }];
      return { items: updatedItems };
    }),
}));
