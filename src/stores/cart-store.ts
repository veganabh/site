import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/types/product";
import type { GiftKitPick, GiftKitRecipient, GiftKitTemplate, KitCartItem } from "@/types/gift-kit";
import { GIFT_PACKAGING_PRICE } from "@/types/gift-kit";
import { applyCouponAction } from "@/server/actions/apply-coupon";
import type { CouponType } from "@/types/coupon";

export type CartItem = {
  product: Product;
  quantity: number;
  /**
   * true quando o item entrou no carrinho via aceite de cross-sell
   * (brinde da economia). Badge celebrativo no card.
   */
  fromCrossSell?: boolean;
};

/**
 * Cupom aplicado no carrinho. Shape mínimo derivado da tabela `coupons`
 * via RPC `validate_coupon`. Sem `discount` como método — `computeCouponDiscount`
 * em `lib/coupons` calcula client-side a partir desse shape.
 */
export type AppliedCoupon = {
  id: string;
  code: string;
  label: string;
  hint: string;
  type: CouponType;
  /** Para PERCENTUAL: 0–100 (%). Para FIXO: valor em R$. Para FRETE_GRATIS: 0. */
  value: number;
};

type CartStore = {
  items: CartItem[];
  /**
   * Kits de presente montados. Array separado de `items` — kit é uma
   * unidade composta (template + picks + personalização), não produto.
   */
  kits: KitCartItem[];

  /** Cupom aplicado no momento. null = sem cupom. */
  appliedCoupon: AppliedCoupon | null;

  /**
   * @deprecated Mantido temporariamente para compat. Solução 2:
   * sugestões recomputadas live em /carrinho — não há flag de sessão.
   */
  crossSellAccepted: boolean;

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  /** Adiciona kit recém-montado ao carrinho. Retorna o cartId gerado. */
  addKit: (input: {
    templateId: string;
    picks: GiftKitPick[];
    packaging?: boolean;
    cardMessage?: string;
    recipient?: GiftKitRecipient;
  }) => string;
  removeKit: (cartId: string) => void;
  /**
   * Atualiza campos do kit no carrinho (embalagem, mensagem, destinatário).
   * Pra editar picks inteiramente, remova e adicione de novo via stepper.
   */
  updateKit: (
    cartId: string,
    patch: Partial<Pick<KitCartItem, "packaging" | "cardMessage" | "recipient" | "picks">>,
  ) => void;

  /**
   * Aplica cupom validado server-side via RPC `validate_coupon`.
   * Retorna { ok: true } ou { ok: false, message } pra UI exibir erro.
   */
  applyCoupon: (
    code: string,
    subtotalCents: number,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  removeCoupon: () => void;

  /**
   * Aceita uma sugestão de cross-sell: adiciona o produto ao carrinho
   * marcado como fromCrossSell = true (brinde da economia).
   */
  acceptCrossSell: (product: Product) => void;
};

function makeCartId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `kit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      kits: [],
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

      clearCart: () =>
        set({ items: [], kits: [], appliedCoupon: null, crossSellAccepted: false }),

      addKit: (input) => {
        const cartId = makeCartId();
        set((state) => ({
          kits: [
            ...state.kits,
            {
              cartId,
              templateId: input.templateId,
              picks: input.picks,
              packaging: input.packaging ?? false,
              cardMessage: input.cardMessage,
              recipient: input.recipient,
            },
          ],
        }));
        return cartId;
      },

      removeKit: (cartId) =>
        set((state) => ({ kits: state.kits.filter((k) => k.cartId !== cartId) })),

      updateKit: (cartId, patch) =>
        set((state) => ({
          kits: state.kits.map((k) => (k.cartId === cartId ? { ...k, ...patch } : k)),
        })),

      applyCoupon: async (code, subtotalCents) => {
        const result = await applyCouponAction({ code, subtotalCents });
        if (!result.ok) {
          return { ok: false, message: result.message };
        }
        set({ appliedCoupon: result.coupon });
        return { ok: true };
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
    }),
    {
      name: "vegana-cart-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Persiste só carrinho real. `crossSellAccepted` é flag deprecada (live recompute).
      partialize: (state) => ({
        items: state.items,
        kits: state.kits,
        appliedCoupon: state.appliedCoupon,
      }),
      migrate() {
        // v1 → v2: shape do appliedCoupon mudou (sem método `discount`).
        // Reset seguro evita blob corrupto quebrar /carrinho.
        return {
          items: [],
          kits: [],
          appliedCoupon: null,
        };
      },
    },
  ),
);

// ── Selectors ────────────────────────────────────────────────────────────
// Helpers para consumidores agregarem itens avulsos + kits no total.
// Templates são injetados pelo caller (via useGiftKitsStore) — evita
// dependência cíclica entre stores e mantém função pura.

export function kitLinePrice(kit: KitCartItem, template: GiftKitTemplate | undefined): number {
  if (!template) return 0;
  return template.price + (kit.packaging ? GIFT_PACKAGING_PRICE : 0);
}

export function kitLinePriceIfoodAnchor(
  kit: KitCartItem,
  template: GiftKitTemplate | undefined,
): number {
  if (!template) return 0;
  return template.priceIfoodAnchor + (kit.packaging ? GIFT_PACKAGING_PRICE : 0);
}

export function cartUnitCount(state: Pick<CartStore, "items" | "kits">): number {
  const itemUnits = state.items.reduce((acc, i) => acc + i.quantity, 0);
  return itemUnits + state.kits.length;
}

export function cartSubtotal(
  state: Pick<CartStore, "items" | "kits">,
  templatesById: Map<string, GiftKitTemplate>,
): number {
  const itemsSubtotal = state.items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const kitsSubtotal = state.kits.reduce(
    (acc, k) => acc + kitLinePrice(k, templatesById.get(k.templateId)),
    0,
  );
  return itemsSubtotal + kitsSubtotal;
}

export function cartIfoodAnchor(
  state: Pick<CartStore, "items" | "kits">,
  templatesById: Map<string, GiftKitTemplate>,
): number {
  const itemsAnchor = state.items.reduce((acc, i) => acc + i.product.price_ifood * i.quantity, 0);
  const kitsAnchor = state.kits.reduce(
    (acc, k) => acc + kitLinePriceIfoodAnchor(k, templatesById.get(k.templateId)),
    0,
  );
  return itemsAnchor + kitsAnchor;
}
