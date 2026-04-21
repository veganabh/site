"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Sparkles,
  Truck,
  RotateCcw,
  UtensilsCrossed,
  Heart,
  PackageCheck,
  Wallet,
  LogIn,
  UserPlus,
  UserCog,
  Gift,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { useSession } from "@/lib/auth/use-session";

const PHRASE_ROTATION_MS = 8000;

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

const DAY_NAMES = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(5, 10).replace("-", "/");
  const dayName = DAY_NAMES[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName}, ${day}/${month}`;
}

export function ContaDashboard() {
  const { isAuthed, user } = useSession();

  if (!isAuthed) {
    return <ContaAnonLanding />;
  }

  return <ContaAuthedDashboard firstName={user?.firstName ?? "você"} />;
}

type ContaAuthedDashboardProps = {
  firstName: string;
};

function ContaAuthedDashboard({ firstName }: ContaAuthedDashboardProps) {
  const deliveries = useOrdersStore((s) => s.deliveries);
  const gifts = useOrdersStore((s) => s.gifts);
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

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[20px] font-bold leading-snug text-olive-900 md:text-[24px]">
          Oi, {firstName} — bora ver seus doces?
        </h1>
      </header>

      <SavingsHero
        totalSavings={totalSavings}
        totalSpent={totalSpent}
        totalOrders={totalOrders}
        aCaminho={aCaminho}
      />

      <ShortcutsRow giftsCount={gifts.length} />

      <OrdersHistory
        placed={deliveries.filter((d) => d.status === "entregue")}
        historical={historical}
      />
    </div>
  );
}

type SavingsHeroProps = {
  totalSavings: number;
  totalSpent: number;
  totalOrders: number;
  aCaminho: number;
};

function SavingsHero({
  totalSavings,
  totalSpent,
  totalOrders,
  aCaminho,
}: SavingsHeroProps) {
  const phrases = getPhrasesForSavings(totalSavings);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, PHRASE_ROTATION_MS);
    return () => window.clearInterval(id);
  }, [phrases.length]);

  const isEmpty = totalSavings <= 0;

  return (
    <section
      aria-labelledby="economia-titulo"
      className="relative overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:p-8"
    >
      <Sparkles
        className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 text-terra-500/30"
        aria-hidden="true"
        strokeWidth={1}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-terra-500/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-3">
        <p
          id="economia-titulo"
          className="text-[11px] font-semibold tracking-wide text-terra-500 uppercase"
        >
          Sua economia acumulada
        </p>

        <p className="text-[44px] font-extrabold leading-none tracking-tight text-paper-50 md:text-[64px]">
          {formatBRL(totalSavings)}
        </p>

        {!isEmpty && (
          <p className="text-[12px] text-paper-50/70 md:text-[13px]">
            de{" "}
            <span className="font-semibold text-paper-50">
              {formatBRL(totalSpent)}
            </span>{" "}
            em {totalOrders} {totalOrders === 1 ? "pedido" : "pedidos"}
            {aCaminho > 0 && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1 font-semibold text-leaf-500">
                  <Truck className="inline h-3 w-3" aria-hidden="true" />
                  {aCaminho} a caminho
                </span>
              </>
            )}
          </p>
        )}

        {isEmpty ? (
          <div className="flex flex-col gap-1">
            <p className="text-body font-semibold text-paper-50">
              Seu primeiro pedido ainda não saiu.
            </p>
            <p className="text-body-sm text-paper-50/70">
              Assim que ele chegar, a gente começa a contar a grana que você
              deixou no bolso.
            </p>
          </div>
        ) : (
          <p
            key={index}
            className="text-body-sm text-paper-50/85"
            style={{ animation: "fade-in-up 450ms ease-out" }}
          >
            Com essa grana, {phrases[index]}.
          </p>
        )}
      </div>
    </section>
  );
}

type ShortcutsRowProps = {
  giftsCount: number;
};

function ShortcutsRow({ giftsCount }: ShortcutsRowProps) {
  const giftLabel = giftsCount === 0 ? "Presentes" : `${giftsCount} presentes`;

  return (
    <nav aria-label="Atalhos da conta" className="grid grid-cols-2 gap-2 md:gap-3">
      <ShortcutChip
        as="link"
        href="/conta/perfil"
        icon={UserCog}
        label="Meus dados"
        tone="neutral"
      />
      <ShortcutChip
        as="link"
        href="/conta/presentes"
        icon={Gift}
        label={giftLabel}
        tone="leaf"
      />
    </nav>
  );
}

type ShortcutChipProps = {
  icon: LucideIcon;
  label: string;
  tone: "terra" | "neutral" | "leaf";
} & (
  | { as: "link"; href: string; onClick?: never }
  | { as: "button"; onClick: () => void; href?: never }
);

function ShortcutChip({
  icon: Icon,
  label,
  tone,
  ...rest
}: ShortcutChipProps) {
  const toneClasses =
    tone === "terra"
      ? "bg-terra-500/10 text-terra-700 group-hover:bg-terra-500/20"
      : tone === "leaf"
        ? "bg-leaf-500/10 text-leaf-700 group-hover:bg-leaf-500/20"
        : "bg-paper-100 text-olive-900 group-hover:bg-sage-300/40";

  const baseClasses =
    "group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-divider bg-paper-50 px-2 py-3 transition-colors hover:bg-paper-100";

  const inner = (
    <>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg transition-colors md:h-12 md:w-12",
          toneClasses,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-center text-[12px] font-semibold leading-tight text-olive-900">
        {label}
      </span>
    </>
  );

  if (rest.as === "link") {
    return (
      <Link href={rest.href} className={baseClasses}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={rest.onClick} className={baseClasses}>
      {inner}
    </button>
  );
}

type OrdersHistoryProps = {
  placed: PlacedDelivery[];
  historical: DeliveryGroup[];
};

type HistoryRow = {
  id: string;
  isoDate: string;
  total: number;
  items: { productId: string; productName: string; quantity: number }[];
};

function OrdersHistory({ placed, historical }: OrdersHistoryProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  function reorder(row: HistoryRow) {
    for (const item of row.items) {
      const product = mockProducts.find((p) => p.id === item.productId);
      if (product) {
        for (let i = 0; i < item.quantity; i++) addItem(product);
      }
    }
    router.push("/carrinho");
  }

  const rows: HistoryRow[] = [
    ...placed.map((d) => ({
      id: d.deliveryId,
      isoDate: d.placedAt,
      total: d.total,
      items: d.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
      })),
    })),
    ...historical.map((g) => ({
      id: g.deliveryId,
      isoDate: g.placedAt,
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
      <section
        aria-labelledby="historico-titulo"
        className="flex flex-col gap-2"
      >
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
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-divider bg-paper-50 px-3 py-2 transition-shadow hover:shadow-sm"
          >
            <span className="shrink-0 text-[11px] font-semibold text-olive-700">
              {formatShortDate(r.isoDate)}
            </span>
            <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              {r.items.slice(0, 3).map((item) => {
                const product = mockProducts.find(
                  (p) => p.id === item.productId,
                );
                return (
                  <li
                    key={`${r.id}-${item.productId}`}
                    className="flex items-center gap-1"
                  >
                    {product && (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded bg-paper-100">
                        <ProductPhoto product={product} sizes="24px" />
                      </div>
                    )}
                    <span className="text-[11.5px] font-medium text-olive-900">
                      {item.productName}
                    </span>
                    <span className="text-[10.5px] font-semibold text-olive-700">
                      {item.quantity}×
                    </span>
                  </li>
                );
              })}
              {r.items.length > 3 && (
                <span className="text-[10.5px] text-olive-700">
                  +{r.items.length - 3}
                </span>
              )}
            </ul>
            <span className="shrink-0 text-body-sm font-bold tabular-nums text-olive-900">
              {formatBRL(r.total)}
            </span>
            <button
              type="button"
              onClick={() => reorder(r)}
              aria-label="Repetir pedido"
              className="inline-flex shrink-0 items-center gap-1 rounded-pill border border-terra-500/30 bg-terra-500/5 px-2.5 py-0.5 text-[11px] font-semibold text-terra-700 transition-colors hover:bg-terra-500/10"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Repetir
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContaAnonLanding() {
  const benefits = [
    {
      icon: Wallet,
      title: "Veja sua economia",
      description:
        "Acumulamos quanto você deixa no bolso comprando aqui em vez do iFood.",
    },
    {
      icon: PackageCheck,
      title: "Acompanhe entregas",
      description: "Status do pedido do forno até a sua porta.",
    },
    {
      icon: Heart,
      title: "Repita favoritos",
      description:
        "Seus doces preferidos voltam pro carrinho em um toque, no dia que der vontade.",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-[20px] font-bold leading-snug text-olive-900 md:text-[24px]">
          Sua conta, seus doces.
        </h1>
        <p className="mt-1 text-body-sm text-olive-700">
          Crie uma conta rapidinho pra acompanhar pedidos, repetir favoritos e
          ver quanto já economizou.
        </p>
      </header>

      <section
        aria-labelledby="anon-cta"
        className="relative overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:p-8"
      >
        <Sparkles
          className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 text-terra-500/30"
          aria-hidden="true"
          strokeWidth={1}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-terra-500/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4">
          <p
            id="anon-cta"
            className="text-[11px] font-semibold tracking-wide text-terra-500 uppercase"
          >
            Entre ou crie uma conta
          </p>

          <p className="text-[28px] font-extrabold leading-tight text-paper-50 md:text-[40px]">
            Leva dois minutos.
            <br className="hidden md:block" /> Vale pra sempre.
          </p>

          <p className="text-[12px] text-paper-50/75 md:text-[13px]">
            Sem letras miúdas — só pra gente te reconhecer no próximo bolo.
          </p>

          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/conta"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-terra-500 px-5 text-[13px] font-semibold text-paper-50 transition-transform active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Criar conta
            </Link>
            <Link
              href="/conta"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-paper-50/25 bg-paper-50/5 px-5 text-[13px] font-semibold text-paper-50 transition-colors hover:bg-paper-50/10"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Por que criar conta" className="flex flex-col gap-2">
        <h2 className="text-h3 font-bold text-olive-900">
          O que tem aqui dentro
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {benefits.map((b) => (
            <li
              key={b.title}
              className="flex flex-col gap-2 rounded-xl border border-divider bg-paper-50 p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-terra-500/10 text-terra-700">
                <b.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-body-sm font-bold text-olive-900">
                {b.title}
              </p>
              <p className="text-[12px] leading-snug text-olive-700">
                {b.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Continue navegando"
        className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-divider bg-paper-50 p-4"
      >
        <p className="text-body-sm text-olive-900">
          Ainda não tá pronto? Sem stress — o cardápio tá aberto.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-pill border border-olive-900 px-5 text-[13px] font-semibold text-olive-900 transition-colors hover:bg-olive-900 hover:text-paper-50"
        >
          <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
          Ver cardápio
        </Link>
      </section>
    </div>
  );
}
