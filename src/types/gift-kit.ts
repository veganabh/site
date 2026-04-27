import type { ProductPhoto } from "@/types/product";
import type { GiftKitIconName } from "@/lib/kit-icons";

/**
 * Slot do kit — uma "posição" que o cliente preenche escolhendo 1 de N
 * produtos elegíveis. Admin define manualmente o pool (`eligibleProductIds`)
 * pra garantir curadoria + CPV controlado.
 */
export type GiftKitSlot = {
  id: string;
  /** Label exibido no stepper ("Escolha o bolo no pote"). */
  label: string;
  /** Frase curta abaixo do label — opcional. */
  helper?: string;
  /** Quantas unidades o cliente escolhe nesse slot (cada uma independe). */
  qty: number;
  /** Pool de produtos válidos para esse slot — UUIDs de products.id. */
  eligibleProductIds: readonly string[];
};

/**
 * Template de kit — criado no admin, persistido em `gift_kit_templates`.
 * Preço fixo independente dos itens escolhidos (admin cura pool com CPV similar).
 *
 * `iconName` resolve via `lib/kit-icons.ts` no client.
 */
export type GiftKitTemplate = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** Copy longa da ficha — até 2 parágrafos. */
  description: string;
  /** Preço final fixo do kit (no canal site). */
  price: number;
  /**
   * Preço-âncora iFood: soma do price_ifood de uma composição típica.
   * Fonte da narrativa "no iFood seriam R$X". Fixo no template — não
   * recalcula a cada escolha (usuário não espera que mude).
   */
  priceIfoodAnchor: number;
  iconName: GiftKitIconName;
  coverPhoto: ProductPhoto;
  slots: readonly GiftKitSlot[];
  active: boolean;
};

/**
 * Escolha do cliente para um slot específico.
 * `productIds.length` sempre == slot.qty após confirmação.
 */
export type GiftKitPick = {
  slotId: string;
  productIds: string[];
};

/**
 * Dados do destinatário quando o kit é presente entregue em outro endereço.
 * Campos opcionais para permitir preenchimento parcial no rascunho.
 */
export type GiftKitRecipient = {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
};

/**
 * Item "kit" pronto pra entrar no carrinho. Mantido em array separado
 * (`kits`) no cart-store — não se mistura com CartItem (produto avulso).
 */
export type KitCartItem = {
  /** UUID local — um cliente pode comprar múltiplas instâncias do mesmo kit. */
  cartId: string;
  templateId: string;
  picks: GiftKitPick[];
  /** Embalagem presente (+R$10). */
  packaging: boolean;
  /** Mensagem impressa no cartão, máx 140 char. */
  cardMessage?: string;
  /** Quando preenchido, entrega vai pro endereço do destinatário. */
  recipient?: GiftKitRecipient;
};

export const GIFT_PACKAGING_PRICE = 10;
export const GIFT_CARD_MESSAGE_MAX = 140;
