"use client";

import {
  ShoppingBag,
  RotateCcw,
  Trash2,
  Minus,
  Plus,
  Tag,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Gift,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ProductPhoto } from "@/components/features/product-photo";
import { KitPicksPanel } from "@/components/dashboard/kit-picks-panel";
import { EmptyCartAnimation } from "@/components/features/empty-cart-animation";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { computeCouponDiscount } from "@/lib/coupons";
import { getCrossSellSuggestions } from "@/lib/cross-sell";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import type { CartItem } from "@/stores/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import type { PlacedDelivery } from "@/stores/orders-store";

type Tab = "em-preparo" | "a-caminho" | "entregue";

const TABS: { id: Tab; label: string }[] = [
  { id: "em-preparo", label: "Pedido" },
  { id: "a-caminho", label: "A caminho" },
  { id: "entregue", label: "Entregues" },
];

type OrderDetailPanelProps = { className?: string };

const TAB_IDS: Tab[] = ["em-preparo", "a-caminho", "entregue"];

const KIT_BUILDER_PATH = /^\/presentear\/[^/]+\/montar(?:\/|$)/;

export function OrderDetailPanel({ className }: OrderDetailPanelProps) {
  const pathname = usePathname() ?? "";
  if (KIT_BUILDER_PATH.test(pathname)) {
    return <KitPicksPanel className={className} />;
  }
  return <OrderDetailPanelInner className={className} />;
}

function OrderDetailPanelInner({ className }: OrderDetailPanelProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const raw = searchParams?.get("tab");
    return raw && TAB_IDS.includes(raw as Tab) ? (raw as Tab) : "em-preparo";
  });

  const cartItems = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);

  const allDeliveries = useOrdersStore((s) => s.deliveries);
  const placedDeliveries = useMemo(
    () => allDeliveries.filter((d) => d.status === "a-caminho"),
    [allDeliveries],
  );
  const deliveredGroups = useMemo(
    () => allDeliveries.filter((d) => d.status === "entregue"),
    [allDeliveries],
  );

  const isCart = activeTab === "em-preparo";

  return (
    <aside
      aria-label="Carrinho"
      className={cn(
        "hidden h-full w-full shrink-0 flex-col border-l border-divider bg-leaf-500/5 xl:flex xl:w-[360px] xl:rounded-br-lg",
        className,
      )}
    >
      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 pb-4 md:pt-4 xl:sticky xl:top-[72px] xl:h-[calc(100vh-72px)] xl:flex-none">
        <header className="flex shrink-0 items-center">
          <h2 className="inline-flex items-center gap-2 text-body-sm font-semibold text-olive-900">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Meu pedido
          </h2>
        </header>

        <div className="flex shrink-0 gap-0.5 rounded-pill bg-paper-100 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={activeTab === t.id ? "true" : undefined}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex-1 rounded-pill px-2 py-1 text-micro font-semibold whitespace-nowrap transition-colors",
                activeTab === t.id
                  ? "bg-olive-900 text-paper-50 shadow-sm"
                  : "text-olive-700 hover:text-olive-900",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isCart ? (
          cartItems.length === 0 ? (
            <EmptyState tab="em-preparo" />
          ) : (
            <CartView items={cartItems} onRemove={removeItem} onUpdateQty={updateQty} />
          )
        ) : activeTab === "entregue" ? (
          deliveredGroups.length === 0 ? (
            <EmptyState tab="entregue" />
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {deliveredGroups.map((group) => (
                <DeliveryCard key={group.deliveryId} group={group} />
              ))}
            </ul>
          )
        ) : placedDeliveries.length === 0 ? (
          <EmptyState tab="a-caminho" />
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {placedDeliveries.map((d) => (
              <PlacedDeliveryCard key={d.deliveryId} delivery={d} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

// ── Vista do carrinho (Modelo A) ──────────────────────────────────────────

function CartView({
  items,
  onRemove,
  onUpdateQty,
}: {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}) {
  const router = useRouter();
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const products = useMenuStore((s) => s.products);

  const [couponOpen, setCouponOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const savings = items.reduce(
    (acc, i) => acc + (i.product.price_ifood - i.product.price_site) * i.quantity,
    0,
  );
  const couponDiscount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, { subtotal, shippingFee: 0 })
    : 0;
  const total = subtotal - couponDiscount;

  const cartIds = useMemo(() => new Set(items.map((i) => i.product.id)), [items]);
  const hasSuggestions = useMemo(
    () => getCrossSellSuggestions(savings, products, cartIds, 1).length > 0,
    [savings, cartIds, products],
  );

  return (
    <>
      {/* Linha compacta: economia + cupom */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        {savings > 0 ? (
          <span className="inline-flex items-center gap-1 text-micro font-semibold text-leaf-700">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {formatBRL(savings)} economizados
          </span>
        ) : (
          <span />
        )}

        {appliedCoupon ? (
          <button
            type="button"
            onClick={removeCoupon}
            aria-label={`Remover cupom ${appliedCoupon.code}`}
            className="group inline-flex items-center gap-1 rounded-pill border border-terra-500/30 bg-terra-500/10 px-2 py-0.5 text-micro font-semibold text-terra-700 transition-colors hover:border-terra-500 hover:bg-terra-500/20"
          >
            <Tag className="h-3 w-3" aria-hidden="true" />
            {appliedCoupon.code}
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCouponOpen(true)}
            className="inline-flex items-center gap-1 text-micro font-semibold text-terra-700 underline-offset-2 transition-colors hover:underline"
          >
            <Tag className="h-3 w-3" aria-hidden="true" />
            Tenho um cupom
          </button>
        )}
      </div>

      {/* HERO: lista de items — toma toda a altura livre */}
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {items.map((item) => (
          <CartItemRow
            key={item.product.id}
            item={item}
            onChangeQty={(delta) => {
              const next = item.quantity + delta;
              if (next < 1) onRemove(item.product.id);
              else onUpdateQty(item.product.id, next);
            }}
            onRemove={() => onRemove(item.product.id)}
          />
        ))}
      </ul>

      {/* Micro-link: upsell mora no checkout */}
      {hasSuggestions && (
        <p className="shrink-0 text-center text-micro text-leaf-700">
          <Gift className="mr-1 inline-block h-3 w-3 align-[-2px]" aria-hidden="true" />
          Dá pra levar algo extra na sua economia — vê no pedido
        </p>
      )}

      {/* Acordeon detalhes */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-micro font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <span>Ver detalhes</span>
          {detailsOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        {detailsOpen && (
          <dl className="mt-1 flex flex-col gap-1 rounded-md bg-paper-100 p-2.5 text-micro">
            <div className="flex justify-between">
              <dt className="text-olive-700">Subtotal</dt>
              <dd className="font-semibold text-olive-900">{formatBRL(subtotal)}</dd>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-olive-700">Cupom</dt>
                <dd className="font-semibold text-terra-700">−{formatBRL(couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-olive-700">Entrega</dt>
              <dd className="font-semibold text-olive-900">Grátis</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Sticky CTA com total embutido */}
      <button
        type="button"
        onClick={() => router.push("/carrinho")}
        className="flex shrink-0 items-center justify-between gap-3 rounded-pill bg-olive-900 px-5 py-3 text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <span className="text-micro font-semibold tracking-wide uppercase opacity-80">
          Fazer pedido
        </span>
        <span className="text-body-sm font-bold">{formatBRL(total)}</span>
      </button>

      {/* Overlay do cupom */}
      {couponOpen && <CouponSheet onClose={() => setCouponOpen(false)} subtotal={subtotal} />}
    </>
  );
}

// ── Overlay do cupom ──────────────────────────────────────────────────────

function CouponSheet({ onClose, subtotal }: { onClose: () => void; subtotal: number }) {
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleApplyCode() {
    if (!code.trim()) return;
    setPending(true);
    setInputError(null);
    const result = await applyCoupon(code, Math.round(subtotal * 100));
    setPending(false);
    if (result.ok) {
      onClose();
    } else {
      setInputError(result.message);
    }
  }

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col justify-end bg-olive-900/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-2.5 rounded-t-2xl border-t border-divider bg-paper-50 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-olive-900">
            <Tag className="h-4 w-4" aria-hidden="true" />
            Aplicar cupom
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setInputError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
            placeholder="Código de cupom"
            aria-label="Código de cupom"
            className={cn(
              "flex-1 rounded-md border bg-paper-50 px-3 py-1.5 text-caption text-olive-900 outline-none placeholder:text-olive-700",
              inputError ? "border-red-400" : "border-divider focus:border-terra-500/50",
            )}
          />
          <button
            type="button"
            onClick={handleApplyCode}
            disabled={pending}
            className="rounded-md bg-olive-900 px-3 py-1.5 text-caption font-semibold text-paper-50 transition-colors hover:bg-terra-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "..." : "Aplicar"}
          </button>
        </div>
        {inputError && <p className="text-micro text-red-500">{inputError}</p>}
      </div>
    </div>
  );
}

// ── Item do carrinho ──────────────────────────────────────────────────────

function CartItemRow({
  item,
  onChangeQty,
  onRemove,
}: {
  item: CartItem;
  onChangeQty: (delta: number) => void;
  onRemove: () => void;
}) {
  const isLast = item.quantity === 1;
  const isGift = item.fromCrossSell;
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-md border p-2 transition-shadow hover:shadow-sm",
        isGift ? "border-leaf-500/40 bg-leaf-500/5" : "border-divider bg-paper-50",
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-paper-100">
        <ProductPhoto product={item.product} sizes="48px" />
        {isGift && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-leaf-500 text-paper-50 shadow-sm"
          >
            <Gift className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <p className="truncate text-caption font-semibold text-olive-900">{item.product.name}</p>
        {isGift ? (
          <p className="inline-flex items-center gap-1 text-micro font-semibold text-leaf-700">
            <Gift className="h-2.5 w-2.5" aria-hidden="true" />
            Brinde da economia
          </p>
        ) : (
          <p className="text-micro text-olive-700">{formatBRL(item.product.price_site)} un</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-caption font-bold text-olive-900">
          {formatBRL(item.product.price_site * item.quantity)}
        </span>
        <div className="flex items-center gap-0.5 rounded-pill bg-paper-100 p-0.5">
          <button
            type="button"
            aria-label={isLast ? `Remover ${item.product.name}` : "Diminuir quantidade"}
            onClick={() => (isLast ? onRemove() : onChangeQty(-1))}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors",
              isLast
                ? "text-olive-700 hover:bg-red-50 hover:text-red-500"
                : "text-olive-900 hover:bg-paper-50",
            )}
          >
            {isLast ? (
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Minus className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
          <span className="w-4 text-center text-micro font-semibold text-olive-900">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            onClick={() => onChangeQty(+1)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-olive-900 transition-colors hover:bg-paper-50"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ── Entregas (inalterado) ─────────────────────────────────────────────────

function PlacedDeliveryCard({ delivery }: { delivery: PlacedDelivery }) {
  const time = new Date(delivery.placedAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex flex-col gap-2 rounded-md border border-terra-500/30 bg-terra-500/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-micro font-semibold text-terra-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-terra-500" />A caminho · {time}
        </div>
        <span className="text-body-sm font-bold text-olive-900">{formatBRL(delivery.total)}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {delivery.items.map((item) => (
          <li key={item.productId} className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-caption font-medium text-olive-900">
              {item.productName}
            </p>
            <span className="shrink-0 text-micro text-olive-700">{item.quantity}×</span>
            <span className="shrink-0 text-micro font-semibold text-olive-900">
              {formatBRL(item.priceSite * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-micro text-olive-700">Pedido {delivery.deliveryId}</p>
    </li>
  );
}

function DeliveryCard({ group }: { group: PlacedDelivery }) {
  const addItem = useCartStore((s) => s.addItem);
  const products = useMenuStore((s) => s.products);
  const date = group.placedAt.slice(5, 10).replace("-", "/");

  function reorderAll() {
    for (const item of group.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) addItem(product);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-divider bg-paper-50 p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-micro font-semibold text-olive-700">Entrega · {date}</span>
        <span className="text-body-sm font-bold text-olive-900">{formatBRL(group.total)}</span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {group.items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return (
            <li key={item.productId} className="flex items-center gap-2">
              {product && (
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm bg-paper-100">
                  <ProductPhoto product={product} sizes="36px" />
                </div>
              )}
              <p className="min-w-0 flex-1 truncate text-caption font-medium text-olive-900">
                {item.productName}
              </p>
              <span className="shrink-0 text-micro text-olive-700">{item.quantity}×</span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={reorderAll}
        className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-pill bg-olive-900 py-1.5 text-micro font-semibold text-paper-50 transition-colors hover:bg-terra-500"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
        Pedir de novo
      </button>
    </li>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, string> = {
    "em-preparo": "Seu carrinho está vazio.",
    "a-caminho": "Nenhum pedido a caminho.",
    entregue: "Seus pedidos entregues aparecem aqui.",
  };
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      {tab === "em-preparo" && <EmptyCartAnimation className="h-40 w-40" />}
      <p className="text-caption text-olive-700">{messages[tab]}</p>
    </div>
  );
}
