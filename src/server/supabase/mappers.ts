import type { Address } from "@/stores/address-store";
import { inferAddressType } from "@/lib/address";
import type { Category } from "@/types/category";
import type { Collection } from "@/types/collection";
import type { Database } from "@/types/db";
import type { Coupon } from "@/types/coupon";
import type { DeliveryPerson } from "@/types/delivery-person";
import type { DeliveryRing } from "@/types/delivery-ring";
import type { GiftKitSlot, GiftKitTemplate } from "@/types/gift-kit";
import type { Order, OrderItem, OrderStatus, PaymentStatus, ShippingAddress } from "@/types/order";
import type {
  Product,
  ProductAttribute,
  ProductCategory,
  ProductContains,
  ProductTag,
} from "@/types/product";
import type { UserAddress, UserProfile } from "@/types/user";
import { isCollectionIconName, type CollectionIconName } from "@/lib/collection-icons";
import { GIFT_KIT_ICON_NAMES, type GiftKitIconName } from "@/lib/kit-icons";

/**
 * Mappers entre shape do Supabase (snake_case, centavos) e shape de domínio
 * (camelCase, reais). Fronteira única — se schema mudar, só este arquivo quebra.
 *
 * Após `supabase gen types typescript --linked > src/types/db.ts`, importar
 * `Database["public"]["Tables"]["<tbl>"]["Row"]` e apertar tipos aqui.
 */

const centsToReais = (cents: number): number => Math.round(cents) / 100;
export const reaisToCents = (reais: number): number => Math.round(reais * 100);

// ── Product ──────────────────────────────────────────────────────────────────

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  gramatura_g: number;
  price_site_cents: number;
  price_ifood_cents: number;
  cost_cents: number;
  attributes: string[];
  tags: string[];
  contains: string[];
  photo_url: string;
  photo_alt: string;
  photo_secondary_url: string | null;
  photo_secondary_alt: string | null;
  active: boolean;
  stock: number;
  low_stock_threshold: number;
  ifood_rating: number | null;
  ifood_order_count: number | null;
  serves: number | null;
  freezable: boolean | null;
  deleted_at: string | null;
};

export function productFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category as ProductCategory,
    gramatura_g: row.gramatura_g,
    price_site: centsToReais(row.price_site_cents),
    price_ifood: centsToReais(row.price_ifood_cents),
    cost: centsToReais(row.cost_cents),
    attributes: row.attributes as ProductAttribute[],
    tags: row.tags as ProductTag[],
    contains: row.contains.length ? (row.contains as ProductContains[]) : undefined,
    photo: { url: row.photo_url, alt: row.photo_alt },
    photoSecondary:
      row.photo_secondary_url && row.photo_secondary_alt !== null
        ? { url: row.photo_secondary_url, alt: row.photo_secondary_alt }
        : undefined,
    active: row.active,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    ifoodRating: row.ifood_rating ?? undefined,
    ifoodOrderCount: row.ifood_order_count ?? undefined,
    serves: row.serves ?? undefined,
    freezable: row.freezable ?? undefined,
  };
}

// ── User Address (domain pra checkout/store, distinto de UserAddress em types/user) ──

type CheckoutAddressRow = {
  id: string;
  profile_id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  deleted_at: string | null;
};

export function addressFromRow(row: CheckoutAddressRow): Address {
  const label = row.label || "Casa";
  return {
    id: row.id,
    type: inferAddressType(label),
    nickname: label,
    street: row.street,
    number: row.number,
    complement: row.complement ?? "",
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    cep: row.cep,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    isDefault: row.is_default,
    // shippingFee derivado via delivery_rings + lat/lng (TODO fase 2).
    // Por enquanto fixo em 0 — taxa real é calculada no place-order via outro
    // helper se geocode estiver disponível.
    shippingFee: 0,
  };
}

// ── Collection ───────────────────────────────────────────────────────────────

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  icon_name: string;
  route_path: string | null;
  product_ids: string[];
  sort_order: number;
  active: boolean;
};

// ── Category ─────────────────────────────────────────────────────────────────

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

export function collectionFromRow(row: CollectionRow): Collection {
  const iconName: CollectionIconName = isCollectionIconName(row.icon_name) ? row.icon_name : "Gift";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    iconName,
    routePath: row.route_path,
    productIds: row.product_ids,
    sortOrder: row.sort_order,
    active: row.active,
  };
}

// ── Gift Kit ─────────────────────────────────────────────────────────────────

type GiftKitTemplateRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price_cents: number;
  price_ifood_anchor_cents: number;
  icon_name: string;
  cover_photo_url: string;
  cover_photo_alt: string;
  active: boolean;
};

type GiftKitSlotRow = {
  id: string;
  template_id: string;
  slot_order: number;
  label: string;
  helper: string | null;
  qty: number;
  eligible_product_ids: string[];
};

const isGiftKitIconName = (value: string): value is GiftKitIconName =>
  (GIFT_KIT_ICON_NAMES as readonly string[]).includes(value);

export function giftKitSlotFromRow(row: GiftKitSlotRow): GiftKitSlot {
  return {
    id: row.id,
    label: row.label,
    helper: row.helper ?? undefined,
    qty: row.qty,
    eligibleProductIds: row.eligible_product_ids,
  };
}

export function giftKitTemplateFromRow(
  template: GiftKitTemplateRow,
  slots: GiftKitSlotRow[],
): GiftKitTemplate {
  const iconName: GiftKitIconName = isGiftKitIconName(template.icon_name)
    ? template.icon_name
    : "Gift";
  const orderedSlots = [...slots]
    .filter((s) => s.template_id === template.id)
    .sort((a, b) => a.slot_order - b.slot_order)
    .map(giftKitSlotFromRow);

  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    tagline: template.tagline,
    description: template.description,
    price: centsToReais(template.price_cents),
    priceIfoodAnchor: centsToReais(template.price_ifood_anchor_cents),
    iconName,
    coverPhoto: { url: template.cover_photo_url, alt: template.cover_photo_alt },
    slots: orderedSlots,
    active: template.active,
  };
}

// ── Coupon ───────────────────────────────────────────────────────────────────

type CouponRow = {
  id: string;
  code: string;
  label: string;
  hint: string;
  type: string;
  value: number;
  min_order_value_cents: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  status: string;
  created_at: string;
};

export function couponFromRow(row: CouponRow): Coupon {
  const value =
    row.type === "FIXO" ? centsToReais(row.value) : row.value;
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    hint: row.hint,
    type: row.type as Coupon["type"],
    value,
    minOrderValue:
      row.min_order_value_cents !== null ? centsToReais(row.min_order_value_cents) : undefined,
    maxUses: row.max_uses ?? undefined,
    usedCount: row.used_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until ?? undefined,
    status: row.status as Coupon["status"],
    createdAt: row.created_at,
  };
}

// ── Delivery ring ────────────────────────────────────────────────────────────

type DeliveryRingRow = {
  id: string;
  ring_order: number;
  inner_radius_m: number;
  outer_radius_m: number;
  fee_cents: number;
  eta_min: number;
  eta_max: number;
  active: boolean;
  label: string;
};

export function deliveryRingFromRow(row: DeliveryRingRow): DeliveryRing {
  return {
    id: row.id,
    order: row.ring_order,
    innerRadiusM: row.inner_radius_m,
    outerRadiusM: row.outer_radius_m,
    fee: centsToReais(row.fee_cents),
    etaMin: row.eta_min,
    etaMax: row.eta_max,
    active: row.active,
    label: row.label,
  };
}

// ── Delivery person ──────────────────────────────────────────────────────────

type DeliveryPersonRow = {
  id: string;
  name: string;
  phone: string;
  plate: string;
  avatar_url: string | null;
  active: boolean;
  deleted_at: string | null;
};

export function deliveryPersonFromRow(row: DeliveryPersonRow): DeliveryPerson {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    plate: row.plate,
    avatarUrl: row.avatar_url ?? undefined,
    active: row.active,
  };
}

export type DeliveryPersonInsertRow = {
  name: string;
  phone: string;
  plate: string;
  avatar_url: string | null;
  active: boolean;
};

export function deliveryPersonToInsert(
  person: Omit<DeliveryPerson, "id">,
): DeliveryPersonInsertRow {
  return {
    name: person.name,
    phone: person.phone,
    plate: person.plate,
    avatar_url: person.avatarUrl ?? null,
    active: person.active,
  };
}

// ── User ─────────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

type UserAddressRow = {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
};

export function userAddressFromRow(row: UserAddressRow): UserAddress {
  return {
    id: row.id,
    label: row.label,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    cep: row.cep,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    isDefault: row.is_default,
  };
}

export function userProfileFromRow(
  profile: ProfileRow,
  email: string,
  addresses: UserAddressRow[],
): UserProfile {
  return {
    id: profile.id,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    email,
    phone: profile.phone ?? "",
    avatarUrl: profile.avatar_url ?? undefined,
    addresses: addresses.map(userAddressFromRow),
    createdAt: profile.created_at,
  };
}

// ── Order ────────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  order_number: number;
  profile_id: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address_snapshot: ShippingAddress;
  status: string;
  payment_status: string;
  source: string;
  subtotal_cents: number;
  shipping_fee_cents: number;
  discount_total_cents: number;
  total_cents: number;
  coupon_code: string | null;
  coupon_discount_cents: number | null;
  cancel_reason: string | null;
  delivery_call_id: string | null;
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  product_id: string | null;
  product_name: string;
  product_category: string | null;
  qty: number;
  unit_price_site_cents: number;
  unit_price_ifood_cents: number;
  notes: string | null;
};

type OrderStatusHistoryRow = {
  status: string;
  at: string;
};

export function orderItemFromRow(row: OrderItemRow): OrderItem {
  return {
    productId: row.product_id ?? "",
    productName: row.product_name,
    productCategory: (row.product_category ?? "bolo") as ProductCategory,
    qty: row.qty,
    unitPriceSite: centsToReais(row.unit_price_site_cents),
    unitPriceIfood: centsToReais(row.unit_price_ifood_cents),
    notes: row.notes ?? undefined,
  };
}

export function orderFromRow(
  row: OrderRow,
  items: OrderItemRow[],
  history: OrderStatusHistoryRow[],
): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    customerId: row.profile_id ?? "",
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address_snapshot,
    items: items.map(orderItemFromRow),
    subtotal: centsToReais(row.subtotal_cents),
    shippingFee: centsToReais(row.shipping_fee_cents),
    discountTotal: centsToReais(row.discount_total_cents),
    total: centsToReais(row.total_cents),
    couponApplied:
      row.coupon_code && row.coupon_discount_cents !== null
        ? { code: row.coupon_code, discountValue: centsToReais(row.coupon_discount_cents) }
        : undefined,
    cancelReason: row.cancel_reason ?? undefined,
    source: row.source as Order["source"],
    deliveryCallId: row.delivery_call_id ?? undefined,
    statusHistory: history.map((h) => ({ status: h.status as OrderStatus, at: h.at })),
  };
}

// ── Inverso: domínio → row (insert) ──────────────────────────────────────────

// ── Order insert (domínio → row) ─────────────────────────────────────────────

export type OrderInsertRow = {
  profile_id: string | null;
  customer_name: string;
  customer_phone: string;
  shipping_address_snapshot: ShippingAddress;
  status: OrderStatus;
  payment_status: PaymentStatus;
  source: Order["source"];
  subtotal_cents: number;
  shipping_fee_cents: number;
  discount_total_cents: number;
  total_cents: number;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount_cents: number | null;
  cancel_reason: string | null;
  delivery_call_id: string | null;
};

export type OrderItemInsertRow = {
  is_kit: boolean;
  product_id: string | null;
  product_name: string;
  product_category: string | null;
  qty: number;
  unit_price_site_cents: number;
  unit_price_ifood_cents: number;
  notes: string | null;
};

export type OrderInsertInput = {
  profileId: string | null;
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  source: Order["source"];
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
  coupon?: { id: string; code: string; discountValue: number };
};

export function orderToInsert(input: OrderInsertInput): OrderInsertRow {
  return {
    profile_id: input.profileId,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    shipping_address_snapshot: input.shippingAddress,
    status: input.status ?? "NOVO",
    payment_status: input.paymentStatus ?? "PENDENTE",
    source: input.source,
    subtotal_cents: reaisToCents(input.subtotal),
    shipping_fee_cents: reaisToCents(input.shippingFee),
    discount_total_cents: reaisToCents(input.discountTotal),
    total_cents: reaisToCents(input.total),
    coupon_id: input.coupon?.id ?? null,
    coupon_code: input.coupon?.code ?? null,
    coupon_discount_cents: input.coupon ? reaisToCents(input.coupon.discountValue) : null,
    cancel_reason: null,
    delivery_call_id: null,
  };
}

export function orderItemToInsert(item: OrderItem & { isKit?: boolean }): OrderItemInsertRow {
  return {
    is_kit: item.isKit ?? false,
    product_id: item.productId || null,
    product_name: item.productName,
    product_category: item.productCategory,
    qty: item.qty,
    unit_price_site_cents: reaisToCents(item.unitPriceSite),
    unit_price_ifood_cents: reaisToCents(item.unitPriceIfood),
    notes: item.notes ?? null,
  };
}

// ── Product insert ───────────────────────────────────────────────────────────

export function productToInsert(product: Omit<Product, "id">): Omit<ProductRow, "id" | "deleted_at"> {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    gramatura_g: product.gramatura_g,
    cost_cents: reaisToCents(product.cost ?? 0),
    price_site_cents: reaisToCents(product.price_site),
    price_ifood_cents: reaisToCents(product.price_ifood),
    attributes: [...product.attributes],
    tags: [...product.tags],
    contains: product.contains ? [...product.contains] : [],
    photo_url: product.photo.url,
    photo_alt: product.photo.alt,
    photo_secondary_url: product.photoSecondary?.url ?? null,
    photo_secondary_alt: product.photoSecondary?.alt ?? null,
    active: product.active,
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold,
    ifood_rating: product.ifoodRating ?? null,
    ifood_order_count: product.ifoodOrderCount ?? null,
    serves: product.serves ?? null,
    freezable: product.freezable ?? null,
  };
}
