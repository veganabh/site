"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Star,
  UtensilsCrossed,
  Sparkles,
  Clock,
  Receipt,
  Truck,
  RotateCcw,
} from "lucide-react";
import { ProductPhoto } from "@/components/features/product-photo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { getPhrasesForSavings } from "@/lib/savings-phrases";
import { listDeliveryGroups } from "@/lib/mock-orders";
import type { DeliveryGroup } from "@/lib/mock-orders";
import { mockProducts } from "@/lib/mock-products";
import { useCartStore } from "@/stores/cart-store";
import { useOrdersStore } from "@/stores/orders-store";
import type { PlacedDelivery } from "@/stores/orders-store";

const PHRASE_ROTATION_MS = 4500;

type PricedItem = {
  priceSite: number;
  priceIfood: number;
  quantity: number;
};

function savingsFromItems(items: PricedItem[]): number {
  return items.reduce(
    (acc, i) => acc + Math.max(0, (i.priceIfood - i.priceSite) * i.quantity),
    0,
  );
}

function spentFromItems(items: PricedItem[]): number {
  return items.reduce((acc, i) => acc + i.priceSite * i.quantity, 0);
}

export function ContaDashboard() {
  const deliveries = useOrdersStore((s) => s.deliveries);
  const historical = useMemo(() => listDeliveryGroups("entregue"), []);

  const placedItems = useMemo<PricedItem[]>(
    () =>
      deliveries.flatMap((d) =>
        d.items.map((i) => ({
          priceSite: i.priceSite,
          priceIfood: i.priceIfood,
          quantity: i.quantity,
        })),
      ),
    [deliveries],
  );

  const historicalItems = useMemo<PricedItem[]>(
    () =>
      historical.flatMap((g) =>
        g.items.map((i) => ({
          priceSite: i.priceSite,
          priceIfood: i.priceIfood,
          quantity: i.quantity,
        })),
      ),
    [historical],
  );

  const totalSavings = savingsFromItems([...placedItems, ...historicalItems]);
  const totalSpent = spentFromItems([...placedItems, ...historicalItems]);
  const totalOrders = deliveries.length + historical.length;
  const aCaminho = deliveries.filter((d) => d.status === "a-caminho").length;

  const lastPlaced = deliveries[0] ?? null;
  const lastHistorical = historical[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-wide text-olive-700 uppercase">
          Sua conta
        </p>
        <h1 className="font-serif text-h2 text-olive-900 italic">
          Oi, Ana — bora ver seus doces?
        </h1>
      </header>

      <SavingsHero total={totalSavings} orders={totalOrders} />

      <StatsStrip
        totalOrders={totalOrders}
        totalSpent={totalSpent}
        aCaminho={aCaminho}
      />

      <QuickActions
        lastPlaced={lastPlaced}
        lastHistorical={lastHistorical}
      />

      <OrdersHistory
        placed={deliveries.filter((d) => d.status === "entregue")}
        historical={historical}
      />
    </div>
  );
}

function SavingsHero({ total, orders }: { total: number; orders: number }) {
  const phrases = getPhrasesForSavings(total);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, PHRASE_ROTATION_MS);
    return () => window.clearInterval(id);
  }, [phrases.length]);

  const isEmpty = total <= 0;

  return (
    <section
      aria-labelledby="economia-titulo"
      className="relative overflow-hidden rounded-2xl border border-olive-900/10 bg-gradient-to-br from-leaf-500/15 via-paper-50 to-terra-500/20 p-6 md:p-8"
    >
      <Sparkles
        className="pointer-events-none absolute -top-6 -right-6 h-32 w-32 text-terra-500/25"
        aria-hidden="true"
        strokeWidth={1}
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p
            id="economia-titulo"
            className="text-[11px] font-semibold tracking-wide text-terra-700 uppercase"
          >
            Sua economia acumulada
          </p>
          {orders > 0 && (
            <span className="rounded-pill bg-terra-500/15 px-2.5 py-1 text-[10px] font-semibold text-terra-700">
              {orders} {orders === 1 ? "pedido" : "pedidos"}
            </span>
          )}
        </div>

        <p className="text-[44px] leading-none font-bold tracking-tight text-olive-900 md:text-[56px]">
          {formatBRL(total)}
        </p>

        {isEmpty ? (
          <div className="flex flex-col gap-1">
            <p className="text-body font-semibold text-olive-900">
              Seu primeiro pedido ainda não saiu.
            </p>
            <p className="text-body-sm text-olive-700">
              Assim que ele chegar, a gente começa a contar a grana que você deixou no bolso.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-body font-semibold text-olive-900">
              Com essa grana que economizou…
            </p>
            <p
              key={index}
              className="text-body-sm text-olive-700"
              style={{ animation: "fade-in-up 450ms ease-out" }}
            >
              {phrases[index]}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

type StatsStripProps = {
  totalOrders: number;
  totalSpent: number;
  aCaminho: number;
};

function StatsStrip({ totalOrders, totalSpent, aCaminho }: StatsStripProps) {
  const stats = [
    {
      icon: Receipt,
      label: totalOrders === 1 ? "pedido feito" : "pedidos feitos",
      value: String(totalOrders),
      chip: "bg-terra-500/15 text-terra-700",
    },
    {
      icon: Clock,
      label: "total gasto",
      value: formatBRL(totalSpent),
      chip: "bg-olive-900/10 text-olive-700",
    },
    {
      icon: Truck,
      label: aCaminho === 0 ? "nenhum a caminho" : "a caminho agora",
      value: aCaminho > 0 ? String(aCaminho) : "—",
      chip: "bg-leaf-500/15 text-leaf-700",
    },
  ];

  return (
    <section aria-label="Resumo" className="grid grid-cols-3 gap-2 md:gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex flex-col gap-2 rounded-xl border border-divider bg-paper-50 p-3 md:p-4"
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                s.chip,
              )}
              aria-hidden="true"
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[20px] leading-none font-bold tracking-tight text-olive-900 md:text-[24px]">
              {s.value}
            </p>
            <p className="text-[11px] text-olive-700">{s.label}</p>
          </div>
        );
      })}
    </section>
  );
}

type QuickActionsProps = {
  lastPlaced: PlacedDelivery | null;
  lastHistorical: DeliveryGroup | null;
};

function QuickActions({ lastPlaced, lastHistorical }: QuickActionsProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  function reorderLast() {
    if (lastPlaced) {
      for (const item of lastPlaced.items) {
        const product = mockProducts.find((p) => p.id === item.productId);
        if (product) {
          for (let i = 0; i < item.quantity; i++) addItem(product);
        }
      }
      router.push("/carrinho");
      return;
    }
    if (lastHistorical) {
      for (const item of lastHistorical.items) {
        const product = mockProducts.find((p) => p.id === item.productId);
        if (product) {
          for (let i = 0; i < item.quantity; i++) addItem(product);
        }
      }
      router.push("/carrinho");
    }
  }

  const hasLast = Boolean(lastPlaced ?? lastHistorical);

  const actions = [
    {
      icon: RotateCcw,
      label: "Repetir último",
      help: hasLast ? "adiciona os itens no carrinho" : "faça seu 1º pedido primeiro",
      disabled: !hasLast,
      onClick: reorderLast,
      chipBase: "bg-terra-500/15 text-terra-700",
      chipHover: "group-hover:bg-terra-500 group-hover:text-paper-50",
    },
    {
      icon: Star,
      label: "Avaliar pedido",
      help: hasLast ? "conte como foi a última entrega" : "ainda sem pedido pra avaliar",
      disabled: !hasLast,
      onClick: () => {
        /* TODO: form de avaliação quando backend estiver pronto */
      },
      chipBase: "bg-leaf-500/15 text-leaf-700",
      chipHover: "group-hover:bg-leaf-500 group-hover:text-paper-50",
    },
    {
      icon: UtensilsCrossed,
      label: "Ver cardápio",
      help: "explore o que tá fresco hoje",
      disabled: false,
      onClick: () => router.push("/"),
      chipBase: "bg-olive-900/10 text-olive-900",
      chipHover: "group-hover:bg-olive-900 group-hover:text-paper-50",
    },
  ];

  return (
    <section aria-labelledby="atalhos-titulo" className="flex flex-col gap-2">
      <h2 id="atalhos-titulo" className="text-h3 font-bold text-olive-900">
        Atalhos rápidos
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              disabled={a.disabled}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-divider bg-paper-50 p-3 text-left transition-colors",
                "hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-paper-50",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                  a.chipBase,
                  !a.disabled && a.chipHover,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-body-sm font-semibold text-olive-900">{a.label}</span>
                <span className="text-[11px] text-olive-700">{a.help}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type OrdersHistoryProps = {
  placed: PlacedDelivery[];
  historical: DeliveryGroup[];
};

type HistoryRow = {
  id: string;
  date: string;
  total: number;
  items: { productId: string; productName: string; quantity: number }[];
};

function OrdersHistory({ placed, historical }: OrdersHistoryProps) {
  const rows: HistoryRow[] = [
    ...placed.map((d) => ({
      id: d.deliveryId,
      date: d.placedAt.slice(5, 10).replace("-", "/"),
      total: d.total,
      items: d.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
      })),
    })),
    ...historical.map((g) => ({
      id: g.deliveryId,
      date: g.placedAt.slice(5, 10).replace("-", "/"),
      total: g.total,
      items: g.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
      })),
    })),
  ].slice(0, 5);

  if (rows.length === 0) {
    return (
      <section aria-labelledby="historico-titulo" className="flex flex-col gap-2">
        <h2 id="historico-titulo" className="text-h3 font-bold text-olive-900">
          Últimos pedidos
        </h2>
        <div className="rounded-xl border border-dashed border-divider bg-paper-50 p-6 text-center">
          <ShoppingBag
            className="mx-auto mb-2 h-6 w-6 text-olive-700"
            aria-hidden="true"
          />
          <p className="text-body-sm text-olive-700">
            Seus pedidos entregues vão aparecer por aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="historico-titulo" className="flex flex-col gap-2">
      <h2 id="historico-titulo" className="text-h3 font-bold text-olive-900">
        Últimos pedidos
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-xl border border-divider bg-paper-50 p-3 transition-shadow hover:shadow-sm md:flex-row md:items-center md:gap-4"
          >
            <div className="flex items-center gap-2 md:w-28 md:shrink-0">
              <span className="rounded-pill bg-terra-500/15 px-2 py-0.5 text-[11px] font-semibold text-terra-700">
                {r.date}
              </span>
              <span className="text-[11px] font-semibold text-olive-900">{r.id}</span>
            </div>

            <ul className="flex flex-1 flex-wrap items-center gap-2">
              {r.items.slice(0, 4).map((item) => {
                const product = mockProducts.find((p) => p.id === item.productId);
                return (
                  <li key={`${r.id}-${item.productId}`} className="flex items-center gap-1.5">
                    {product && (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-paper-100">
                        <ProductPhoto product={product} sizes="32px" />
                      </div>
                    )}
                    <span className="text-[12px] font-medium text-olive-900">
                      {item.productName}
                    </span>
                    <span className="text-[11px] text-olive-700">{item.quantity}×</span>
                  </li>
                );
              })}
              {r.items.length > 4 && (
                <span className="text-[11px] text-olive-700">
                  +{r.items.length - 4} outros
                </span>
              )}
            </ul>

            <span className="text-body-sm font-bold text-olive-900 md:ml-auto">
              {formatBRL(r.total)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
