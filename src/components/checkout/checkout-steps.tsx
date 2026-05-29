"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { placeOrderAction } from "@/server/actions/place-order";
import {
  createAddressAction,
  removeAddressAction,
  updateAddressAction,
} from "@/server/profile/address-actions";
import {
  Tag,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  QrCode,
  Trash2,
  Minus,
  Plus,
  Home,
  Briefcase,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Gift,
  ShoppingBag,
  Mail,
  Phone,
  User,
  Package,
  MessageCircle,
} from "lucide-react";
import { ProductPhoto } from "@/components/features/product-photo";
import { EmptyCartAnimation } from "@/components/features/empty-cart-animation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL, formatCEP } from "@/lib/format";
import { lookupCEP } from "@/lib/cep";
import { computeCouponDiscount } from "@/lib/coupons";
import { getCrossSellSuggestions } from "@/lib/cross-sell";
import { getPhrasesForSavings } from "@/lib/savings-phrases";
import { captureEvent } from "@/lib/analytics";
import { kitLinePrice, kitLinePriceIfoodAnchor, useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import { useCheckoutStore } from "@/stores/checkout-store";
import { useGiftKitsStore, giftKitsById } from "@/stores/gift-kits-store";
import { useSession } from "@/lib/auth/use-session";
import {
  useAddressStore,
  selectCurrentAddress,
  type Address,
  type AddressType,
} from "@/stores/address-store";
import type { CartItem } from "@/stores/cart-store";
import type { CheckoutStep } from "@/stores/checkout-store";
import type { Product } from "@/types/product";
import { KitCoverPhoto } from "@/components/gift/kit-cover-photo";
import { GIFT_PACKAGING_PRICE, type KitCartItem } from "@/types/gift-kit";

const PHRASE_ROTATION_MS = 8000;

export function CheckoutSteps() {
  const step = useCheckoutStore((s) => s.step);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 pt-4 pb-40 md:pb-10">
      {step !== "confirmado" && <StepIndicator current={step} />}
      {step === "resumo" && <StepResumo />}
      {step === "endereco" && <StepEndereco />}
      {step === "pagamento" && <StepPagamento />}
      {step === "confirmado" && <StepConfirmado />}
    </div>
  );
}

const STEP_ORDER: Exclude<CheckoutStep, "confirmado">[] = ["resumo", "endereco", "pagamento"];

const STEP_LABELS: Record<Exclude<CheckoutStep, "confirmado">, string> = {
  resumo: "Resumo",
  endereco: "Endereço",
  pagamento: "Pagamento",
};

function StepIndicator({ current }: { current: Exclude<CheckoutStep, "confirmado"> }) {
  const setStep = useCheckoutStore((s) => s.setStep);
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <nav
      aria-label="Etapas do checkout"
      className="flex items-center justify-center gap-1.5 text-caption"
    >
      {STEP_ORDER.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        const isClickable = isDone;
        return (
          <div key={step} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && setStep(step)}
              aria-current={isActive ? "step" : undefined}
              aria-label={STEP_LABELS[step]}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-pill font-semibold transition-all",
                isActive && "bg-olive-900 px-2.5 text-paper-50",
                isDone && "cursor-pointer px-1 text-olive-900 hover:bg-paper-100",
                !isActive && !isDone && "px-1 text-olive-700/50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-micro font-bold",
                  isActive && "bg-paper-50 text-olive-900",
                  isDone && "bg-leaf-500 text-paper-50",
                  !isActive && !isDone && "bg-paper-100 text-olive-700/60",
                )}
              >
                {isDone ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              {isActive && <span>{STEP_LABELS[step]}</span>}
            </button>
            {idx < STEP_ORDER.length - 1 && (
              <span
                aria-hidden="true"
                className={cn("h-px w-4 md:w-6", idx < currentIdx ? "bg-leaf-500" : "bg-divider")}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Taxa de entrega mock para o step de resumo (sem endereço selecionado ainda). */
const MOCK_SHIPPING_FEE = 0;

function StepResumo() {
  const items = useCartStore((s) => s.items);
  const kits = useCartStore((s) => s.kits);
  const setStep = useCheckoutStore((s) => s.setStep);

  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const acceptCrossSell = useCartStore((s) => s.acceptCrossSell);

  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);

  const giftKits = useGiftKitsStore((s) => s.kits);
  const templatesById = useMemo(() => giftKitsById(giftKits), [giftKits]);

  const itemsSubtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const kitsSubtotal = kits.reduce(
    (acc, k) => acc + kitLinePrice(k, templatesById.get(k.templateId)),
    0,
  );
  const subtotal = itemsSubtotal + kitsSubtotal;

  const itemsSavings = items.reduce(
    (acc, i) => acc + (i.product.price_ifood - i.product.price_site) * i.quantity,
    0,
  );
  const kitsSavings = kits.reduce((acc, k) => {
    const tpl = templatesById.get(k.templateId);
    return acc + (kitLinePriceIfoodAnchor(k, tpl) - kitLinePrice(k, tpl));
  }, 0);
  const savings = itemsSavings + kitsSavings;

  const cartCtx = { subtotal, shippingFee: MOCK_SHIPPING_FEE };
  const couponDiscount = appliedCoupon ? computeCouponDiscount(appliedCoupon, cartCtx) : 0;
  const total = subtotal - couponDiscount;

  const products = useMenuStore((s) => s.products);
  const cartIds = useMemo(() => new Set(items.map((i) => i.product.id)), [items]);
  const suggestions = useMemo(
    () => getCrossSellSuggestions(savings, products, cartIds, 4),
    [savings, cartIds, products],
  );

  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  if (items.length === 0 && kits.length === 0) return <EmptyCart />;

  async function handleApplyCode() {
    if (!code.trim()) return;
    setCouponPending(true);
    setCouponError(null);
    const result = await applyCoupon(code, Math.round(subtotal * 100));
    setCouponPending(false);
    if (result.ok) {
      setInputError(false);
      setCouponError(null);
      setCode("");
    } else {
      setInputError(true);
      setCouponError(result.message);
    }
  }

  const showCouponPanel = couponOpen || !!appliedCoupon;

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-h3 leading-snug font-bold text-olive-900 md:text-h2">Seu pedido</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          cardápio
        </Link>
      </header>

      {savings > 0 && <SavingsHero savings={savings} />}

      <section aria-label="Itens do pedido" className="flex flex-col gap-2">
        <h2 className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
          {items.length + kits.length} {items.length + kits.length === 1 ? "item" : "itens"}
        </h2>
        <ul className="flex flex-col gap-2">
          {kits.map((kit) => (
            <KitCartItemCompact key={kit.cartId} kit={kit} />
          ))}
          {items.map((item) => (
            <CartItemCompact key={item.product.id} item={item} />
          ))}
        </ul>
      </section>

      {suggestions.length > 0 && (
        <CrossSellRail suggestions={suggestions} onAccept={acceptCrossSell} savings={savings} />
      )}

      {/* Cupom — fechado por padrão; abre automático se há aplicáveis ou já tem um aplicado */}
      <section aria-labelledby="cupom-heading" className="flex flex-col gap-2">
        {!showCouponPanel ? (
          <button
            type="button"
            onClick={() => setCouponOpen(true)}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-pill border border-divider bg-paper-50 px-4 text-body-sm font-semibold text-olive-900 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            Tem cupom?
          </button>
        ) : (
          <>
            <h2
              id="cupom-heading"
              className="text-micro font-semibold tracking-wide text-olive-700 uppercase"
            >
              Cupom
            </h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-terra-500/30 bg-terra-500/5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-body-sm font-semibold text-terra-700">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {appliedCoupon.code}{" "}
                    <span className="font-normal text-olive-700">· {appliedCoupon.hint}</span>
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Remover cupom"
                  onClick={removeCoupon}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-olive-500"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setInputError(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                    placeholder="Código de cupom"
                    aria-label="Código de cupom"
                    className={cn(
                      "flex-1 rounded-pill border bg-paper-50 px-4 py-2 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus-visible:outline-2 focus-visible:outline-olive-500",
                      inputError ? "border-error" : "border-divider focus:border-terra-500/50",
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCode}
                    disabled={couponPending}
                    className="rounded-pill bg-olive-900 px-5 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {couponPending ? "Validando..." : "Aplicar"}
                  </button>
                </div>
                {inputError && (
                  <p className="text-micro text-error" role="alert">
                    {couponError ?? "Cupom inválido."}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Resumo de valores */}
      <section aria-labelledby="valores-heading" className="flex flex-col gap-2">
        <h2
          id="valores-heading"
          className="text-micro font-semibold tracking-wide text-olive-700 uppercase"
        >
          Valores
        </h2>
        <Card padding="none" className="p-4">
          <dl className="flex flex-col gap-2 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-olive-700">Subtotal</dt>
              <dd className="font-semibold text-olive-900 tabular-nums">{formatBRL(subtotal)}</dd>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-olive-700">Cupom</dt>
                <dd className="font-semibold text-terra-700 tabular-nums">
                  −{formatBRL(couponDiscount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-olive-700">Entrega</dt>
              <dd className="font-semibold text-success tabular-nums">Grátis</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t border-divider pt-2.5">
              <dt className="font-semibold text-olive-900">Total</dt>
              <dd className="text-h3 font-bold text-olive-900 tabular-nums">{formatBRL(total)}</dd>
            </div>
          </dl>
        </Card>
      </section>

      {/* CTA desktop inline — mobile usa sticky bar */}
      <button
        type="button"
        onClick={() => setStep("endereco")}
        className="hidden h-11 items-center justify-center gap-2 rounded-pill bg-terra-500 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-700 focus-visible:outline-2 focus-visible:outline-olive-500 md:inline-flex"
      >
        Confirmar endereço
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      <StickyCTA
        total={total}
        itemCount={items.reduce((acc, i) => acc + i.quantity, 0) + kits.length}
        label="Confirmar endereço"
        onClick={() => setStep("endereco")}
      />
    </>
  );
}

function SavingsHero({ savings }: { savings: number }) {
  const phrases = getPhrasesForSavings(savings);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, PHRASE_ROTATION_MS);
    return () => window.clearInterval(id);
  }, [phrases.length]);

  return (
    <section
      aria-labelledby="economia-titulo"
      className="relative overflow-hidden rounded-2xl bg-olive-900 p-5 text-paper-50 shadow-lg md:p-6"
    >
      <Sparkles
        className="pointer-events-none absolute -top-5 -right-5 h-28 w-28 text-terra-500/30"
        aria-hidden="true"
        strokeWidth={1}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-terra-500/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-2">
        <p
          id="economia-titulo"
          className="text-micro font-semibold tracking-wide text-terra-500 uppercase"
        >
          Você tá economizando
        </p>
        <p className="text-h1 leading-none font-extrabold tracking-tight text-paper-50 md:text-display">
          {formatBRL(savings)}
        </p>
        <p className="text-caption text-paper-50/70">
          comparado ao iFood — direto aqui sai mais em conta.
        </p>
        <p
          key={index}
          className="mt-1 text-body-sm text-paper-50/85"
          style={{ animation: "fade-in-up 450ms ease-out" }}
        >
          Com essa grana, {phrases[index]}.
        </p>
      </div>
    </section>
  );
}

type CrossSellRailProps = {
  suggestions: readonly Product[];
  onAccept: (product: Product) => void;
  savings: number;
};

function CrossSellRail({ suggestions, onAccept, savings }: CrossSellRailProps) {
  return (
    <section aria-labelledby="cross-sell-heading" className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between gap-2">
        <h2
          id="cross-sell-heading"
          className="inline-flex items-center gap-1.5 text-micro font-semibold tracking-wide text-olive-700 uppercase"
        >
          <Gift className="h-3 w-3 text-leaf-500" aria-hidden="true" />
          Leve também
        </h2>
        <span className="text-micro text-olive-700">dá pra pegar até {formatBRL(savings)}</span>
      </header>
      <ul className="-mx-3 flex snap-x gap-2 overflow-x-auto scroll-smooth px-3 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-2 md:overflow-visible md:px-0">
        {suggestions.map((product) => (
          <li key={product.id} className="w-32 shrink-0 snap-start md:w-auto">
            <button
              type="button"
              onClick={() => onAccept(product)}
              aria-label={`Adicionar ${product.name} ao carrinho como brinde da economia`}
              className="group flex h-full w-full flex-col gap-1.5 rounded-xl border border-leaf-500/30 bg-paper-50 p-2 text-left transition-all hover:border-leaf-500 hover:bg-leaf-500/10 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-leaf-500"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-paper-100">
                <ProductPhoto product={product} sizes="128px" />
                <span className="absolute top-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-leaf-500 text-paper-50 shadow-sm group-hover:bg-leaf-700">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.5} />
                </span>
              </div>
              <p className="line-clamp-2 text-caption leading-tight font-semibold text-olive-900">
                {product.name}
              </p>
              <p className="text-caption font-bold text-leaf-700">
                {formatBRL(product.price_site)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type StickyCTAProps = {
  total: number;
  itemCount: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hideSummary?: boolean;
};

function StickyCTA({ total, itemCount, label, onClick, disabled, hideSummary }: StickyCTAProps) {
  return (
    <div
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 rounded-2xl border border-divider bg-paper-50/95 px-5 py-3 shadow-lg backdrop-blur md:hidden"
      role="region"
      aria-label="Ações do pedido"
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        {!hideSummary && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
            <span className="text-body font-bold text-olive-900 tabular-nums">
              {formatBRL(total)}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-pill px-4 text-body-sm font-semibold text-paper-50 transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
            disabled ? "cursor-not-allowed bg-sage-300" : "bg-terra-500 hover:bg-terra-700",
          )}
        >
          {label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function isGuestIdentityValid(
  g: {
    firstName: string;
    email: string;
    phone: string;
  } | null,
): boolean {
  if (!g) return false;
  const nameOk = g.firstName.trim().length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.email.trim());
  const phoneOk = g.phone.replace(/\D/g, "").length >= 10;
  return nameOk && emailOk && phoneOk;
}

function StepEndereco() {
  const setStep = useCheckoutStore((s) => s.setStep);
  const guest = useCheckoutStore((s) => s.guest);
  const { isAuthed } = useSession();
  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedId);
  const selectAddress = useAddressStore((s) => s.selectAddress);
  const removeAddressLocal = useAddressStore((s) => s.removeAddressLocal);

  const currentAddress = useAddressStore(selectCurrentAddress);

  const [, startRemoving] = useTransition();
  const [, setRemoveError] = useState<string | null>(null);

  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const shippingFee = currentAddress?.shippingFee ?? 0;
  const couponDiscount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, { subtotal, shippingFee })
    : 0;
  const total = subtotal - couponDiscount + shippingFee;
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [removeDialogId, setRemoveDialogId] = useState<string | null>(null);

  const prevFeeRef = useRef<number>(currentAddress?.shippingFee ?? 0);
  const [showFeeWarning, setShowFeeWarning] = useState(false);

  function handleSelect(id: string) {
    const prev = currentAddress?.shippingFee ?? 0;
    selectAddress(id);
    const next = useAddressStore.getState().addresses.find((a) => a.id === id)?.shippingFee ?? 0;
    setShowFeeWarning(prev !== next);
    prevFeeRef.current = next;
  }

  function handleRemoveConfirm() {
    const id = removeDialogId;
    if (!id) return;
    setRemoveError(null);
    startRemoving(async () => {
      const result = await removeAddressAction(id);
      if (!result.ok) {
        setRemoveError(result.message);
        return;
      }
      removeAddressLocal(id);
      setRemoveDialogId(null);
    });
  }

  function handleEdit(address: Address) {
    setEditingAddress(address);
    setFormOpen(true);
  }

  function handleAddNew() {
    setEditingAddress(null);
    setFormOpen(true);
  }

  const guestComplete = isAuthed || isGuestIdentityValid(guest);
  const canAdvance = Boolean(selectedId) && guestComplete;

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Pra onde vai?</h1>
        <button
          type="button"
          onClick={() => setStep("resumo")}
          className="inline-flex items-center gap-1 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          voltar
        </button>
      </header>

      {!isAuthed && <GuestIdentityCard />}

      {currentAddress && (
        <p className="text-body-sm text-olive-700">
          Entrega em:{" "}
          <span className="font-semibold text-olive-900">
            {currentAddress.nickname || addressTypeLabel(currentAddress.type)} —{" "}
            {currentAddress.street}, {currentAddress.number}
          </span>
        </p>
      )}

      <ul className="flex flex-col gap-2" aria-label="Endereços salvos">
        {addresses.map((address) => {
          const isSelected = address.id === selectedId;
          return (
            <li key={address.id}>
              <div
                className={cn(
                  "relative rounded-2xl border p-4 transition-all",
                  isSelected
                    ? "border-olive-500 bg-paper-50 shadow-sm"
                    : "border-divider bg-paper-50 hover:border-olive-500/40",
                )}
              >
                <button
                  type="button"
                  aria-label={`Selecionar endereço: ${address.nickname || addressTypeLabel(address.type)}`}
                  onClick={() => handleSelect(address.id)}
                  className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-olive-500"
                />

                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AddressTypeChip type={address.type} />
                      {address.nickname && address.nickname !== addressTypeLabel(address.type) && (
                        <p className="text-body-sm leading-snug font-semibold text-olive-900">
                          {address.nickname}
                        </p>
                      )}
                      {isSelected && (
                        <span
                          aria-label="Selecionado"
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-olive-500"
                        >
                          <Check
                            className="h-2.5 w-2.5 text-paper-50"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-caption leading-relaxed text-olive-700">
                      {address.street}, {address.number}
                      {address.complement ? ` — ${address.complement}` : ""}
                    </p>
                    <p className="text-caption leading-relaxed text-olive-700">
                      {address.neighborhood} · {address.city}/{address.state} · {address.cep}
                    </p>
                    {address.shippingFee > 0 && (
                      <p className="mt-1 text-micro font-semibold text-terra-700">
                        Taxa de entrega: {formatBRL(address.shippingFee)}
                      </p>
                    )}
                    {address.shippingFee === 0 && (
                      <p className="mt-1 text-caption font-semibold text-success">
                        Entrega grátis para este endereço
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${address.nickname || addressTypeLabel(address.type)}`}
                      onClick={() => handleEdit(address)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${address.nickname || addressTypeLabel(address.type)}`}
                      onClick={() => setRemoveDialogId(address.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-olive-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleAddNew}
        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-pill border border-dashed border-olive-500/50 px-4 text-body-sm font-semibold text-olive-700 transition-colors hover:border-olive-500 hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Adicionar endereço
      </button>

      {showFeeWarning && currentAddress && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/8 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-caption text-olive-900">
            {currentAddress.shippingFee > 0
              ? `Taxa de entrega para este endereço: ${formatBRL(currentAddress.shippingFee)}.`
              : "Entrega grátis para este endereço."}
          </p>
        </div>
      )}

      {/* CTA desktop inline */}
      <button
        type="button"
        disabled={!canAdvance}
        onClick={() => setStep("pagamento")}
        className="hidden h-11 items-center justify-center gap-2 rounded-pill bg-terra-500 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-700 focus-visible:outline-2 focus-visible:outline-olive-500 disabled:cursor-not-allowed disabled:bg-sage-300 md:inline-flex"
      >
        Ir para pagamento
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>

      <StickyCTA
        total={total}
        itemCount={itemCount}
        label="Ir para pagamento"
        onClick={() => setStep("pagamento")}
        disabled={!canAdvance}
      />

      {formOpen && (
        <AddressFormModal initialData={editingAddress} onClose={() => setFormOpen(false)} />
      )}

      {removeDialogId && (
        <RemoveAddressDialog
          address={addresses.find((a) => a.id === removeDialogId)!}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveDialogId(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers e subcomponentes do StepEndereco
// ---------------------------------------------------------------------------

export function addressTypeLabel(type: AddressType): string {
  if (type === "casa") return "Casa";
  if (type === "trabalho") return "Trabalho";
  return "Outro";
}

export function AddressTypeChip({ type }: { type: AddressType }) {
  const Icon = type === "casa" ? Home : type === "trabalho" ? Briefcase : MapPin;
  const label = addressTypeLabel(type);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-paper-100 px-2 py-0.5 text-micro font-semibold tracking-wide text-olive-900 uppercase"
      aria-label={label}
    >
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal de formulário de endereço
// ---------------------------------------------------------------------------

type AddressFormModalProps = {
  initialData: Address | null;
  onClose: () => void;
};

export function AddressFormModal({ initialData, onClose }: AddressFormModalProps) {
  const upsertAddress = useAddressStore((s) => s.upsertAddress);

  const [type, setType] = useState<AddressType>(initialData?.type ?? "casa");
  const [nickname, setNickname] = useState(initialData?.nickname ?? "");
  const [cep, setCep] = useState(initialData?.cep ?? "");
  const [street, setStreet] = useState(initialData?.street ?? "");
  const [number, setNumber] = useState(initialData?.number ?? "");
  const [complement, setComplement] = useState(initialData?.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "MG");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialData;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    const controller = new AbortController();

    lookupCEP(cep, controller.signal).then((result) => {
      if (controller.signal.aborted || !result) return;
      setStreet(result.street);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);
    });

    return () => controller.abort();
  }, [cep]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalNickname = nickname.trim() || addressTypeLabel(type);

    startTransition(async () => {
      const payload = {
        nickname: finalNickname,
        cep,
        street,
        number,
        complement: complement || undefined,
        neighborhood,
        city,
        state,
        ...(initialData?.isDefault ? { isDefault: true } : {}),
      };

      const result = isEditing
        ? await updateAddressAction(initialData.id, payload)
        : await createAddressAction(payload);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      // Atualiza store local imediatamente — revalidatePath também vai puxar
      // do servidor mas sem aguardar HTTP roundtrip da revalidação.
      upsertAddress(result.address);
      onClose();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Editar endereço" : "Adicionar endereço"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-olive-900/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-paper-50 p-6 shadow-lg sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 font-bold text-olive-900">
            {isEditing ? "Editar endereço" : "Novo endereço"}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-olive-700 hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <fieldset>
            <legend className="mb-1.5 text-caption font-semibold text-olive-900">Tipo</legend>
            <div className="flex gap-2">
              {(["casa", "trabalho", "outro"] as AddressType[]).map((t) => {
                const Icon = t === "casa" ? Home : t === "trabalho" ? Briefcase : MapPin;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-caption font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
                      type === t
                        ? "border-olive-500 bg-olive-500 text-paper-50"
                        : "border-divider bg-paper-100 text-olive-700 hover:border-olive-500/50",
                    )}
                  >
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {addressTypeLabel(t)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <FormField
            label="Apelido (opcional)"
            id="addr-nickname"
            value={nickname}
            onChange={setNickname}
            placeholder="Ex: Casa da mãe"
          />

          <FormField
            label="CEP"
            id="addr-cep"
            value={cep}
            onChange={(v) => setCep(formatCEP(v))}
            placeholder="00000-000"
            inputMode="numeric"
            required
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <FormField
                label="Logradouro"
                id="addr-street"
                value={street}
                onChange={setStreet}
                placeholder="Rua, Av., etc."
                required
              />
            </div>
            <div className="w-24">
              <FormField
                label="Número"
                id="addr-number"
                value={number}
                onChange={setNumber}
                placeholder="123"
                required
              />
            </div>
          </div>

          <FormField
            label="Complemento"
            id="addr-complement"
            value={complement}
            onChange={setComplement}
            placeholder="Apto, sala, bloco..."
          />

          <FormField
            label="Bairro"
            id="addr-neighborhood"
            value={neighborhood}
            onChange={setNeighborhood}
            placeholder="Savassi"
            required
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <FormField
                label="Cidade"
                id="addr-city"
                value={city}
                onChange={setCity}
                placeholder="Belo Horizonte"
                required
              />
            </div>
            <div className="w-20">
              <FormField
                label="UF"
                id="addr-state"
                value={state}
                onChange={setState}
                placeholder="MG"
                maxLength={2}
                required
              />
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md bg-terra-500/10 px-3 py-2 text-caption font-semibold text-terra-700"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center rounded-pill px-4 text-body-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
                pending
                  ? "cursor-wait bg-sage-300 text-paper-50/80"
                  : "bg-olive-900 text-paper-50 hover:bg-terra-500",
              )}
            >
              {pending ? "Salvando…" : isEditing ? "Salvar" : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-pill border border-divider px-4 text-body-sm font-semibold text-olive-700 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertDialog de confirmação de remoção
// ---------------------------------------------------------------------------

type RemoveAddressDialogProps = {
  address: Address;
  onConfirm: () => void;
  onCancel: () => void;
};

function RemoveAddressDialog({ address, onConfirm, onCancel }: RemoveAddressDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-addr-title"
      aria-describedby="remove-addr-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-paper-50 p-6 shadow-lg">
        <h2 id="remove-addr-title" className="text-body font-semibold text-olive-900">
          Remover endereço?
        </h2>
        <p id="remove-addr-desc" className="mt-2 text-body-sm text-olive-700">
          {address.nickname || addressTypeLabel(address.type)} — {address.street}, {address.number}{" "}
          será removido permanentemente.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-pill border border-divider px-4 text-body-sm font-semibold text-olive-700 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center rounded-pill bg-error px-4 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-error"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campo de formulário reutilizável
// ---------------------------------------------------------------------------

type FormFieldProps = {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
};

function FormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
  maxLength,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-caption font-semibold text-olive-900">
        {label}
        {required && (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        className="rounded-md border border-divider bg-white px-3 py-2 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus:border-olive-500 focus-visible:outline-2 focus-visible:outline-olive-500"
      />
    </div>
  );
}

type PaymentTab = "cartao" | "pix";

function StepPagamento() {
  const [tab, setTab] = useState<PaymentTab>("pix");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const kits = useCartStore((s) => s.kits);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const clearCart = useCartStore((s) => s.clearCart);
  const setStep = useCheckoutStore((s) => s.setStep);
  const setOrderId = useCheckoutStore((s) => s.setOrderId);
  const selectedAddress = useAddressStore(selectCurrentAddress);

  const giftKits = useGiftKitsStore((s) => s.kits);
  const templatesById = useMemo(() => giftKitsById(giftKits), [giftKits]);

  const itemsSubtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const kitsSubtotal = kits.reduce(
    (acc, k) => acc + kitLinePrice(k, templatesById.get(k.templateId)),
    0,
  );
  const subtotal = itemsSubtotal + kitsSubtotal;
  const couponDiscount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, { subtotal: itemsSubtotal, shippingFee: 0 })
    : 0;
  const total = subtotal - couponDiscount;
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0) + kits.length;

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  function handleConfirm() {
    if (isPending) return;
    setError(null);

    if (!selectedAddress) {
      setError("Selecione um endereço de entrega.");
      setStep("endereco");
      return;
    }

    if (kits.length > 0) {
      setError(
        "Kits presente ainda não estão suportados no checkout atual. Remova os kits do carrinho.",
      );
      return;
    }

    if (items.length === 0) {
      setError("Carrinho vazio.");
      return;
    }

    startTransition(async () => {
      const result = await placeOrderAction({
        items: items.map((i) => ({ productId: i.product.id, qty: i.quantity })),
        shippingAddress: {
          street: selectedAddress.street,
          number: selectedAddress.number,
          complement: selectedAddress.complement || undefined,
          neighborhood: selectedAddress.neighborhood,
          city: selectedAddress.city,
          state: selectedAddress.state,
          cep: selectedAddress.cep,
        },
        shippingFee: selectedAddress.shippingFee,
        couponCode: appliedCoupon?.code,
        paymentMethod: tab === "cartao" ? "card" : "pix",
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      captureEvent("order_placed", {
        orderId: result.orderId,
        method: tab === "cartao" ? "card" : "pix",
        items: items.length,
      });

      // Cartão = redirect pro checkout hospedado AbacatePay (URL externa).
      // Quando o cliente termina de pagar, AbacatePay devolve em
      // `completionUrl` que aponta pra `/obrigado/<id>`.
      if (result.redirectUrl) {
        clearCart();
        setStep("confirmado");
        setOrderId(result.orderId);
        window.location.href = result.redirectUrl;
        return;
      }

      clearCart();
      setStep("confirmado");
      setOrderId(result.orderId);
      router.push(`/obrigado/${result.orderId}`);
    });
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-h2 font-bold text-olive-900">Pagamento</h1>
        <button
          type="button"
          onClick={() => setStep("endereco")}
          className="inline-flex items-center gap-1 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          voltar
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Forma de pagamento"
        className="flex gap-0.5 rounded-pill bg-paper-100 p-0.5"
      >
        {(["cartao", "pix"] as PaymentTab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-pill px-4 py-2 text-body-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
              tab === t
                ? "bg-olive-900 text-paper-50 shadow-sm"
                : "text-olive-700 hover:text-olive-900",
            )}
          >
            {t === "cartao" ? "Cartão" : "PIX"}
          </button>
        ))}
      </div>

      {tab === "cartao" ? (
        <section aria-label="Dados do cartão" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-number" className="text-caption font-semibold text-olive-900">
              Número do cartão
            </label>
            <input
              id="card-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="rounded-md border border-divider bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus:border-terra-500/50 focus-visible:outline-2 focus-visible:outline-olive-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-name" className="text-caption font-semibold text-olive-900">
              Nome no cartão
            </label>
            <input
              id="card-name"
              type="text"
              autoComplete="cc-name"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Como está no cartão"
              className="rounded-md border border-divider bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus:border-terra-500/50 focus-visible:outline-2 focus-visible:outline-olive-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="card-expiry" className="text-caption font-semibold text-olive-900">
                Validade
              </label>
              <input
                id="card-expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                className="rounded-md border border-divider bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus:border-terra-500/50 focus-visible:outline-2 focus-visible:outline-olive-500"
              />
            </div>

            <div className="flex w-28 flex-col gap-1.5">
              <label htmlFor="card-cvv" className="text-caption font-semibold text-olive-900">
                CVV
              </label>
              <input
                id="card-cvv"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="123"
                className="rounded-md border border-divider bg-paper-50 px-3 py-2.5 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus:border-terra-500/50 focus-visible:outline-2 focus-visible:outline-olive-500"
              />
            </div>
          </div>
        </section>
      ) : (
        <section aria-label="Pagamento via PIX" className="flex flex-col items-center gap-4 py-4">
          <div
            aria-hidden="true"
            className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-divider bg-paper-100"
          >
            <QrCode className="h-10 w-10 text-olive-500/40" />
          </div>
          <p className="text-center text-body-sm text-olive-700">QR Code gerado ao confirmar</p>
        </section>
      )}

      <Card padding="none" className="flex flex-col gap-1.5 px-4 py-3">
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-caption">
            <span className="text-olive-700">Subtotal</span>
            <span className="font-semibold text-olive-900 tabular-nums">{formatBRL(subtotal)}</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-caption">
            <span className="text-olive-700">Cupom</span>
            <span className="font-semibold text-terra-700 tabular-nums">
              −{formatBRL(couponDiscount)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-body-sm font-semibold text-olive-900">Total</span>
          <span className="text-h3 font-bold text-olive-900 tabular-nums">{formatBRL(total)}</span>
        </div>
      </Card>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md bg-terra-500/10 px-3 py-2 text-caption font-semibold text-terra-700"
        >
          <span>{error}</span>
          {error.includes("/conta") ? (
            <Link
              href="/conta"
              className="inline-flex w-fit items-center gap-1 rounded-pill bg-terra-500 px-3 py-1 text-paper-50 transition-colors hover:bg-terra-700"
            >
              Ir pra minha conta
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* CTA desktop inline */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className={cn(
          "hidden h-11 items-center justify-center gap-2 rounded-pill px-6 text-body-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-olive-500 md:inline-flex",
          isPending
            ? "cursor-wait bg-sage-300 text-paper-50/80"
            : "bg-terra-500 text-paper-50 hover:bg-terra-700",
        )}
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Registrando…" : "Efetuar pagamento"}
      </button>

      <StickyCTA
        total={total}
        itemCount={itemCount}
        label={isPending ? "Registrando…" : "Efetuar pagamento"}
        onClick={handleConfirm}
      />
    </>
  );
}

const RING_DURATION_MS = 4000;
const RING_RADIUS = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function StepConfirmado() {
  const orderId = useCheckoutStore((s) => s.orderId);
  const reset = useCheckoutStore((s) => s.reset);
  const router = useRouter();

  useEffect(() => {
    const id = window.setTimeout(() => {
      reset();
      router.push("/?tab=a-caminho");
    }, RING_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [reset, router]);

  function goTo(path: string) {
    reset();
    router.push(path);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
          <circle
            cx="48"
            cy="48"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-olive-900)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE}
            style={
              {
                "--ring-circumference": RING_CIRCUMFERENCE,
                animation: `countdown-ring ${RING_DURATION_MS}ms linear forwards`,
              } as React.CSSProperties
            }
          />
        </svg>
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-olive-900/10">
          <Check className="h-10 w-10 text-olive-900" aria-hidden="true" strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-extrabold text-olive-900">Pedido confirmado!</h1>
        {orderId && (
          <p className="text-body-sm text-olive-700">
            Número do pedido: <span className="font-semibold text-olive-900">{orderId}</span>
          </p>
        )}
        <p className="text-body-sm text-olive-700">
          Previsão de entrega: <span className="font-semibold text-olive-900">~60 min</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => goTo("/?tab=a-caminho")}
          className="inline-flex h-11 w-full items-center justify-center rounded-pill bg-terra-500 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-700 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          Acompanhar pedido
        </button>

        <button
          type="button"
          onClick={() => goTo("/")}
          className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-divider bg-paper-50 px-6 text-body-sm font-semibold text-olive-900 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          Ver cardápio
        </button>
      </div>
    </div>
  );
}

function EmptyCart() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <EmptyCartAnimation className="h-48 w-48" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h2 font-bold text-olive-900">Seu cantinho doce tá esperando</h1>
        <p className="text-body-sm text-olive-700">
          Escolha um bolo, um brigadeiro — e o resto a gente cuida.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/")}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-terra-500 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-700 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        Ver cardápio
      </button>
    </div>
  );
}

function CartItemCompact({ item }: { item: CartItem }) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  function handleDecrement() {
    if (item.quantity <= 1) {
      removeItem(item.product.id);
    } else {
      updateQty(item.product.id, item.quantity - 1);
    }
  }

  function handleIncrement() {
    updateQty(item.product.id, item.quantity + 1);
  }

  const isGift = item.fromCrossSell;
  const unitSite = item.product.price_site;
  const unitIfood = item.product.price_ifood;
  const lineTotal = unitSite * item.quantity;
  const lineSavings = Math.max(0, (unitIfood - unitSite) * item.quantity);

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3",
        isGift ? "border-leaf-500/40 bg-leaf-500/5" : "border-divider bg-paper-50",
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-paper-100">
        <ProductPhoto product={item.product} sizes="64px" />
        {isGift && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-leaf-500 text-paper-50 shadow-sm"
          >
            <Gift className="h-3 w-3" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 leading-snug">
        <p className="text-body-sm font-semibold text-olive-900">{item.product.name}</p>
        {isGift ? (
          <p className="inline-flex items-center gap-1 text-micro font-semibold text-leaf-700">
            <Gift className="h-2.5 w-2.5" aria-hidden="true" />
            Brinde da economia
          </p>
        ) : (
          <div className="flex items-baseline gap-1.5 text-micro">
            <span className="font-semibold text-olive-900 tabular-nums">{formatBRL(unitSite)}</span>
            {unitIfood > unitSite && (
              <span className="text-olive-700/60 tabular-nums line-through">
                {formatBRL(unitIfood)}
              </span>
            )}
            <span className="text-olive-700">· un</span>
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-pill border border-divider bg-paper-50"
            role="group"
            aria-label={`Quantidade de ${item.product.name}`}
          >
            <button
              type="button"
              aria-label="Diminuir quantidade"
              onClick={handleDecrement}
              className="flex h-8 w-8 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
            >
              {item.quantity <= 1 ? (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <span
              className="w-5 text-center text-body-sm font-semibold text-olive-900 tabular-nums"
              aria-live="polite"
              aria-label={`${item.quantity} unidades`}
            >
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={handleIncrement}
              className="flex h-8 w-8 items-center justify-center rounded-full text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {!isGift && lineSavings > 0 && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-leaf-500/10 px-2 py-0.5 text-micro font-semibold text-leaf-700">
              −{formatBRL(lineSavings)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-body-sm font-bold text-olive-900 tabular-nums">
          {formatBRL(lineTotal)}
        </span>
      </div>
    </li>
  );
}

function KitCartItemCompact({ kit }: { kit: KitCartItem }) {
  const removeKit = useCartStore((s) => s.removeKit);
  const products = useMenuStore((s) => s.products);
  const giftKits = useGiftKitsStore((s) => s.kits);
  const template = giftKits.find((k) => k.id === kit.templateId);
  if (!template) return null;

  const linePrice = kitLinePrice(kit, template);
  const lineAnchor = kitLinePriceIfoodAnchor(kit, template);
  const lineSavings = Math.max(0, lineAnchor - linePrice);

  const picksByLabel = template.slots.map((slot) => {
    const pick = kit.picks.find((p) => p.slotId === slot.id);
    const names = (pick?.productIds ?? [])
      .map((id) => products.find((p) => p.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return {
      slotId: slot.id,
      label: slot.label,
      names,
    };
  });

  return (
    <li className="flex flex-col gap-3 rounded-xl border-2 border-terra-500/40 bg-terra-500/5 p-3">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-paper-100">
          <KitCoverPhoto photo={template.coverPhoto} sizes="64px" />
          <span
            aria-hidden="true"
            className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-terra-500 text-paper-50 shadow-sm"
          >
            <Gift className="h-3 w-3" />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
          <p className="text-body-sm font-bold text-olive-900">{template.name}</p>
          <p className="text-micro text-olive-700">Kit de presente montado</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-body-sm font-bold text-olive-900 tabular-nums">
            {formatBRL(linePrice)}
          </span>
          {lineSavings > 0 && (
            <span className="text-micro text-olive-700/60 tabular-nums line-through">
              iFood {formatBRL(lineAnchor)}
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-1 rounded-md bg-paper-50 p-3">
        {picksByLabel.map((row) => (
          <li key={row.slotId} className="text-micro text-olive-900">
            <span className="font-semibold text-olive-700">{row.label}:</span>{" "}
            {row.names.join(", ")}
          </li>
        ))}
        {kit.packaging && (
          <li className="mt-1 inline-flex items-center gap-1 text-micro font-semibold text-terra-700">
            <Package className="h-3 w-3" aria-hidden="true" />
            Embalagem de presente (+{formatBRL(GIFT_PACKAGING_PRICE)})
          </li>
        )}
        {kit.cardMessage && (
          <li className="mt-0.5 inline-flex items-start gap-1 text-micro text-olive-900">
            <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-terra-500" aria-hidden="true" />
            <span className="italic">&ldquo;{kit.cardMessage}&rdquo;</span>
          </li>
        )}
        {kit.recipient && (
          <li className="mt-0.5 inline-flex items-center gap-1 text-micro font-semibold text-olive-700">
            <MapPin className="h-3 w-3 text-terra-500" aria-hidden="true" />
            entrega pra {kit.recipient.name}
          </li>
        )}
      </ul>

      <div className="flex items-center gap-2">
        <a
          href={`/presentear/${template.slug}/montar`}
          className="inline-flex h-8 items-center gap-1 rounded-pill border border-divider bg-paper-50 px-3 text-micro font-semibold text-olive-900 transition-colors hover:bg-paper-100"
        >
          Editar escolhas
        </a>
        <button
          type="button"
          onClick={() => removeKit(kit.cartId)}
          aria-label={`Remover ${template.name}`}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-error/10 hover:text-error"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function GuestIdentityCard() {
  const guest = useCheckoutStore((s) => s.guest);
  const setGuest = useCheckoutStore((s) => s.setGuest);

  const [firstName, setFirstName] = useState(guest?.firstName ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");

  const valid = isGuestIdentityValid({ firstName, email, phone });

  useEffect(() => {
    if (valid) {
      setGuest({ firstName: firstName.trim(), email: email.trim(), phone });
    } else {
      setGuest(null);
    }
  }, [firstName, email, phone, valid, setGuest]);

  function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return (
    <Card
      as="section"
      aria-labelledby="guest-identity-title"
      padding="none"
      className="flex flex-col gap-3 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terra-500/10 text-terra-700">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p id="guest-identity-title" className="text-body-sm font-bold text-olive-900">
            Pra gente te reconhecer
          </p>
          <p className="text-caption leading-snug text-olive-700">
            Nome, e-mail e WhatsApp. Sem cadastro — é só pra gente confirmar a entrega.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
            Primeiro nome
          </span>
          <div className="relative">
            <User
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-olive-700/60"
              aria-hidden="true"
            />
            <input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ana"
              className="h-10 w-full rounded-md border border-divider bg-paper-50 pr-3 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus-visible:outline-2 focus-visible:outline-olive-500"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
            E-mail
          </span>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-olive-700/60"
              aria-hidden="true"
            />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana@exemplo.com"
              className="h-10 w-full rounded-md border border-divider bg-paper-50 pr-3 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus-visible:outline-2 focus-visible:outline-olive-500"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-micro font-semibold tracking-wide text-olive-700 uppercase">
            WhatsApp
          </span>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-olive-700/60"
              aria-hidden="true"
            />
            <input
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(31) 99999-9999"
              className="h-10 w-full rounded-md border border-divider bg-paper-50 pr-3 pl-9 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus-visible:outline-2 focus-visible:outline-olive-500"
            />
          </div>
        </label>
      </div>

      {valid && (
        <p
          className="inline-flex items-center gap-1.5 text-caption font-semibold text-leaf-700"
          role="status"
          aria-live="polite"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={3} />
          Tudo certo — pode seguir pro endereço.
        </p>
      )}
    </Card>
  );
}
