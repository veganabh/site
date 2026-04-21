"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { ProductPhoto } from "@/components/features/product-photo";
import { EmptyCartAnimation } from "@/components/features/empty-cart-animation";
import { cn } from "@/lib/utils";
import { formatBRL, formatCEP } from "@/lib/format";
import { AVAILABLE_COUPONS, isCouponApplicable } from "@/lib/coupons";
import { getCrossSellSuggestions } from "@/lib/cross-sell";
import { mockProducts } from "@/lib/mock-products";
import { useCartStore } from "@/stores/cart-store";
import { useCheckoutStore } from "@/stores/checkout-store";
import { useOrdersStore } from "@/stores/orders-store";
import {
  useAddressStore,
  selectCurrentAddress,
  type Address,
  type AddressType,
} from "@/stores/address-store";
import type { CartItem } from "@/stores/cart-store";

export function CheckoutSteps() {
  const step = useCheckoutStore((s) => s.step);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6">
      {step === "resumo" && <StepResumo />}
      {step === "endereco" && <StepEndereco />}
      {step === "pagamento" && <StepPagamento />}
      {step === "confirmado" && <StepConfirmado />}
    </div>
  );
}

/** Taxa de entrega mock para o step de resumo (sem endereço selecionado ainda). */
const MOCK_SHIPPING_FEE = 0;

function StepResumo() {
  const items = useCartStore((s) => s.items);
  const setStep = useCheckoutStore((s) => s.setStep);

  // Cupom centralizado no store — sincronizado com o painel lateral
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const acceptCrossSell = useCartStore((s) => s.acceptCrossSell);

  const [code, setCode] = useState("");
  const [inputError, setInputError] = useState(false);

  if (items.length === 0) return <EmptyCart />;

  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const savings = items.reduce(
    (acc, i) => acc + (i.product.price_ifood - i.product.price_site) * i.quantity,
    0,
  );

  const cartCtx = { subtotal, shippingFee: MOCK_SHIPPING_FEE };
  const couponDiscount = appliedCoupon ? appliedCoupon.discount(subtotal, cartCtx) : 0;
  const total = subtotal - couponDiscount;

  // Filtra cupons que não dariam desconto real no contexto atual
  const applicableCoupons = AVAILABLE_COUPONS.filter((c) => isCouponApplicable(c, cartCtx));

  const cartIds = useMemo(() => new Set(items.map((i) => i.product.id)), [items]);
  const suggestions = useMemo(
    () => getCrossSellSuggestions(savings, mockProducts, cartIds, 3),
    [savings, cartIds],
  );

  function handleApplyCode() {
    const ok = applyCoupon(code);
    if (ok) {
      setInputError(false);
      setCode("");
    } else {
      setInputError(true);
    }
  }

  return (
    <>
      <h1 className="font-serif text-h2 text-olive-900 italic">Resumo do pedido</h1>

      <ul className="flex flex-col gap-2" aria-label="Itens do pedido">
        {items.map((item) => (
          <CartItemCompact key={item.product.id} item={item} />
        ))}
      </ul>

      {/* Continuar comprando — abaixo da lista, sem competir com CTA principal */}
      <a
        href="/loja"
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-olive-900 px-4 text-[13px] font-semibold text-olive-900 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Continuar comprando
      </a>

      {/* Campo de cupom — estado vem do store */}
      {appliedCoupon ? (
        <div className="flex items-center justify-between rounded-md border border-terra-500/30 bg-terra-500/5 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-terra-700">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            {appliedCoupon.code} · {appliedCoupon.hint}
          </div>
          <button
            type="button"
            aria-label="Remover cupom"
            onClick={removeCoupon}
            className="text-olive-700 transition-colors hover:text-error focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
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
                "flex-1 rounded-md border bg-paper-50 px-3 py-2 text-body-sm text-olive-900 transition-colors outline-none placeholder:text-olive-500 focus-visible:outline-2 focus-visible:outline-olive-500",
                inputError ? "border-error" : "border-divider focus:border-terra-500/50",
              )}
            />
            <button
              type="button"
              onClick={handleApplyCode}
              className="rounded-md bg-paper-100 px-4 py-2 text-body-sm font-semibold text-olive-900 transition-colors hover:bg-paper-100/80 focus-visible:outline-2 focus-visible:outline-olive-500"
            >
              Aplicar
            </button>
          </div>
          {inputError && (
            <p className="text-[11px] text-error" role="alert">
              Cupom inválido.
            </p>
          )}
          {/* Chips apenas dos cupons que gerariam desconto real */}
          {applicableCoupons.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold tracking-wide text-olive-700 uppercase">
                Cupons disponíveis
              </p>
              <div className="flex flex-wrap gap-1">
                {applicableCoupons.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      applyCoupon(c.code);
                      setInputError(false);
                      setCode("");
                    }}
                    className="group inline-flex items-center gap-1 rounded-pill border border-terra-500/30 bg-terra-500/5 px-2 py-0.5 text-[10px] font-semibold text-terra-700 transition-colors hover:border-terra-500 hover:bg-terra-500 hover:text-paper-50"
                  >
                    <Tag className="h-2.5 w-2.5" aria-hidden="true" />
                    {c.code}
                    <span className="text-terra-700/70 group-hover:text-paper-50/80">
                      · {c.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Economia — cabeçalho celebrativo */}
      {savings > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-leaf-500/30 bg-leaf-500/5 p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-leaf-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Você está economizando
            </span>
            <span className="text-body font-bold text-leaf-700">{formatBRL(savings)}</span>
          </div>
          <p className="text-[12px] leading-snug text-olive-700">
            comprando direto aqui em vez do iFood.
          </p>
        </div>
      )}

      {/* Cross-sell — 3 sugestões lado a lado, recomputadas ao vivo */}
      {suggestions.length > 0 && (
        <section
          aria-labelledby="cross-sell-heading"
          className="flex flex-col gap-2.5 rounded-md border border-leaf-500/30 bg-paper-50 p-3"
        >
          <header className="flex items-center justify-between gap-2">
            <h2
              id="cross-sell-heading"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-leaf-700"
            >
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              Na sua economia dá pra levar
            </h2>
            <span className="text-[10px] text-olive-700">
              até {formatBRL(savings)}
            </span>
          </header>
          <ul className="grid grid-cols-3 gap-2">
            {suggestions.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => acceptCrossSell(product)}
                  aria-label={`Adicionar ${product.name} ao carrinho como brinde da economia`}
                  className="group flex h-full w-full flex-col gap-1.5 rounded-md border border-leaf-500/30 bg-paper-50 p-2 text-left transition-all hover:border-leaf-500 hover:bg-leaf-500/10 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-leaf-500"
                >
                  <div className="relative aspect-square overflow-hidden rounded-sm bg-paper-100">
                    <ProductPhoto product={product} sizes="100px" />
                    <span className="absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-leaf-500 text-paper-50 shadow-sm group-hover:bg-leaf-700">
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-olive-900">
                    {product.name}
                  </p>
                  <p className="text-[11px] font-bold text-leaf-700">
                    {formatBRL(product.price_site)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Resumo de valores */}
      <div className="rounded-xl border border-divider bg-paper-100 p-4">
        <dl className="flex flex-col gap-2 text-body-sm">
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
          <div className="mt-1 flex justify-between border-t border-divider pt-2">
            <dt className="font-semibold text-olive-900">Total</dt>
            <dd className="text-body font-bold text-olive-900">{formatBRL(total)}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={() => setStep("endereco")}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-olive-900 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        Confirmar endereço
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
}

function StepEndereco() {
  const setStep = useCheckoutStore((s) => s.setStep);
  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedId);
  const selectAddress = useAddressStore((s) => s.selectAddress);
  const removeAddress = useAddressStore((s) => s.removeAddress);

  const currentAddress = useAddressStore(selectCurrentAddress);

  // Estado do formulário de add/edit
  const [formOpen, setFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Estado do diálogo de confirmação de remoção
  const [removeDialogId, setRemoveDialogId] = useState<string | null>(null);

  // Taxa do endereço anterior — para aviso de mudança
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
    if (removeDialogId) removeAddress(removeDialogId);
    setRemoveDialogId(null);
  }

  function handleEdit(address: Address) {
    setEditingAddress(address);
    setFormOpen(true);
  }

  function handleAddNew() {
    setEditingAddress(null);
    setFormOpen(true);
  }

  return (
    <>
      <h1 className="font-serif text-h2 text-olive-900 italic">Endereço de entrega</h1>

      {/* Indicador do endereço selecionado */}
      {currentAddress && (
        <p className="text-[12px] text-olive-700">
          Entrega em:{" "}
          <span className="font-semibold text-olive-900">
            {currentAddress.nickname || addressTypeLabel(currentAddress.type)} —{" "}
            {currentAddress.street}, {currentAddress.number}
          </span>
        </p>
      )}

      {/* Lista de endereços selecionáveis */}
      <ul className="flex flex-col gap-2" aria-label="Endereços salvos">
        {addresses.map((address) => {
          const isSelected = address.id === selectedId;
          return (
            <li key={address.id}>
              <div
                className={cn(
                  "relative rounded-xl border p-4 transition-all",
                  isSelected
                    ? "border-olive-500 bg-paper-50 shadow-sm"
                    : "border-divider bg-paper-50 hover:border-olive-500/40",
                )}
              >
                {/* Botão de seleção cobre toda a área */}
                <button
                  type="button"
                  aria-label={`Selecionar endereço: ${address.nickname || addressTypeLabel(address.type)}`}
                  onClick={() => handleSelect(address.id)}
                  className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-olive-500"
                />

                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AddressTypeChip type={address.type} />
                      {address.nickname && address.nickname !== addressTypeLabel(address.type) && (
                        <p className="text-[13px] font-semibold text-olive-900 leading-snug">
                          {address.nickname}
                        </p>
                      )}
                      {isSelected && (
                        <span
                          aria-label="Selecionado"
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-olive-500"
                        >
                          <Check className="h-2.5 w-2.5 text-paper-50" strokeWidth={3} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-olive-700">
                      {address.street}, {address.number}
                      {address.complement ? ` — ${address.complement}` : ""}
                    </p>
                    <p className="text-[12px] leading-relaxed text-olive-700">
                      {address.neighborhood} · {address.city}/{address.state} · {address.cep}
                    </p>
                    {address.shippingFee > 0 && (
                      <p className="mt-1 text-[11px] font-semibold text-terra-700">
                        Taxa de entrega: {formatBRL(address.shippingFee)}
                      </p>
                    )}
                    {address.shippingFee === 0 && (
                      <p className="mt-1 text-[12px] font-semibold text-success">
                        Entrega grátis para este endereço
                      </p>
                    )}
                  </div>

                  {/* Ações: editar e remover — z acima do botão de seleção */}
                  <div className="relative z-10 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Editar ${address.nickname || addressTypeLabel(address.type)}`}
                      onClick={() => handleEdit(address)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
                    >
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${address.nickname || addressTypeLabel(address.type)}`}
                      onClick={() => setRemoveDialogId(address.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-olive-500"
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

      {/* Botão adicionar endereço */}
      <button
        type="button"
        onClick={handleAddNew}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-dashed border-olive-500/50 px-4 text-[13px] font-semibold text-olive-700 transition-colors hover:border-olive-500 hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Adicionar endereço
      </button>

      {/* Aviso de mudança de taxa */}
      {showFeeWarning && currentAddress && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/8 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-[12px] text-olive-900">
            {currentAddress.shippingFee > 0
              ? `Taxa de entrega para este endereço: ${formatBRL(currentAddress.shippingFee)}.`
              : "Entrega grátis para este endereço."}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => setStep("pagamento")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-olive-900 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 disabled:cursor-not-allowed disabled:bg-sage-300 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          Ir para pagamento
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setStep("resumo")}
          className="inline-flex h-9 items-center justify-center gap-1.5 text-[13px] font-semibold text-olive-700 transition-colors hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar
        </button>
      </div>

      {/* Modal de formulário de endereço */}
      {formOpen && (
        <AddressFormModal
          initialData={editingAddress}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* AlertDialog de confirmação de remoção */}
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

function addressTypeLabel(type: AddressType): string {
  if (type === "casa") return "Casa";
  if (type === "trabalho") return "Trabalho";
  return "Outro";
}

function AddressTypeChip({ type }: { type: AddressType }) {
  const Icon = type === "casa" ? Home : type === "trabalho" ? Briefcase : MapPin;
  const label = addressTypeLabel(type);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-paper-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-olive-900"
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

function AddressFormModal({ initialData, onClose }: AddressFormModalProps) {
  const addAddress = useAddressStore((s) => s.addAddress);
  const updateAddress = useAddressStore((s) => s.updateAddress);

  const [type, setType] = useState<AddressType>(initialData?.type ?? "casa");
  const [nickname, setNickname] = useState(initialData?.nickname ?? "");
  const [cep, setCep] = useState(initialData?.cep ?? "");
  const [street, setStreet] = useState(initialData?.street ?? "");
  const [number, setNumber] = useState(initialData?.number ?? "");
  const [complement, setComplement] = useState(initialData?.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "MG");

  const isEditing = !!initialData;

  // Fecha com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      type,
      nickname,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      shippingFee: 0, // mock — cálculo real virá do backend
    };
    if (isEditing) {
      updateAddress(initialData.id, payload);
    } else {
      addAddress(payload);
    }
    onClose();
  }

  return (
    /* Overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Editar endereço" : "Adicionar endereço"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-olive-900/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-lg bg-paper-50 p-6 shadow-lg sm:rounded-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-h3 text-olive-900 italic">
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
          {/* Tipo */}
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-semibold text-olive-900">Tipo</legend>
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
                      "inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
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

          {/* Apelido */}
          <FormField
            label="Apelido (opcional)"
            id="addr-nickname"
            value={nickname}
            onChange={setNickname}
            placeholder="Ex: Casa da mãe"
          />

          {/* CEP */}
          <FormField
            label="CEP"
            id="addr-cep"
            value={cep}
            onChange={(v) => setCep(formatCEP(v))}
            placeholder="00000-000"
            inputMode="numeric"
            required
          />

          {/* Logradouro + número */}
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

          {/* Complemento */}
          <FormField
            label="Complemento"
            id="addr-complement"
            value={complement}
            onChange={setComplement}
            placeholder="Apto, sala, bloco..."
          />

          {/* Bairro */}
          <FormField
            label="Bairro"
            id="addr-neighborhood"
            value={neighborhood}
            onChange={setNeighborhood}
            placeholder="Savassi"
            required
          />

          {/* Cidade + UF */}
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

          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              className="inline-flex flex-1 h-10 items-center justify-center rounded-pill bg-olive-900 px-4 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
            >
              {isEditing ? "Salvar" : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-pill border border-divider px-4 text-[13px] font-semibold text-olive-700 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
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
  // Fecha com Escape
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-lg bg-paper-50 p-6 shadow-lg">
        <h2 id="remove-addr-title" className="font-semibold text-body text-olive-900">
          Remover endereço?
        </h2>
        <p id="remove-addr-desc" className="mt-2 text-[13px] text-olive-700">
          {address.nickname || addressTypeLabel(address.type)} —{" "}
          {address.street}, {address.number} será removido permanentemente.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-pill border border-divider px-4 text-[13px] font-semibold text-olive-700 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center rounded-pill bg-error px-4 text-[13px] font-semibold text-paper-50 transition-colors hover:bg-error/90 focus-visible:outline-2 focus-visible:outline-error"
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
      <label htmlFor={id} className="text-[12px] font-semibold text-olive-900">
        {label}
        {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
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
  const [tab, setTab] = useState<PaymentTab>("cartao");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const items = useCartStore((s) => s.items);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const clearCart = useCartStore((s) => s.clearCart);
  const setStep = useCheckoutStore((s) => s.setStep);
  const setOrderId = useCheckoutStore((s) => s.setOrderId);
  const placeOrder = useOrdersStore((s) => s.placeOrder);

  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discount(subtotal) : 0;
  const total = subtotal - couponDiscount;

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
    const id = `VG-${Date.now().toString(36).toUpperCase()}`;
    placeOrder(items, id);
    clearCart(); // reseta cupom e crossSellAccepted também
    setOrderId(id);
    setStep("confirmado");
  }

  return (
    <>
      <h1 className="font-serif text-h2 text-olive-900 italic">Pagamento</h1>

      {/* Tabs */}
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

      {/* Tab panels */}
      {tab === "cartao" ? (
        <section aria-label="Dados do cartão" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-number" className="text-[12px] font-semibold text-olive-900">
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
            <label htmlFor="card-name" className="text-[12px] font-semibold text-olive-900">
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
              <label htmlFor="card-expiry" className="text-[12px] font-semibold text-olive-900">
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
              <label htmlFor="card-cvv" className="text-[12px] font-semibold text-olive-900">
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
            className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-divider bg-paper-100"
          >
            <QrCode className="h-10 w-10 text-olive-500/40" />
          </div>
          <p className="text-center text-[13px] text-olive-700">QR Code gerado ao confirmar</p>
        </section>
      )}

      {/* Resumo compacto com desconto de cupom quando aplicável */}
      <div className="flex flex-col gap-1.5 rounded-md border border-divider bg-paper-100 px-4 py-3">
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-olive-700">Subtotal</span>
            <span className="font-semibold text-olive-900">{formatBRL(subtotal)}</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-olive-700">Cupom</span>
            <span className="font-semibold text-terra-700">−{formatBRL(couponDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-semibold text-olive-900">Total</span>
          <span className="text-body font-bold text-olive-900">{formatBRL(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-olive-900 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          Efetuar pagamento
        </button>

        <button
          type="button"
          onClick={() => setStep("endereco")}
          className="inline-flex h-9 items-center justify-center gap-1.5 text-[13px] font-semibold text-olive-700 transition-colors hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar
        </button>
      </div>
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
        <h1 className="font-serif text-h1 text-olive-900 italic">Pedido confirmado!</h1>
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
          className="inline-flex h-11 w-full items-center justify-center rounded-pill bg-olive-900 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
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
        <h1 className="font-serif text-h2 text-olive-900 italic">Carrinho vazio</h1>
        <p className="text-body-sm text-olive-700">
          Escolha um item do cardápio para começar seu pedido.
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/")}
        className="inline-flex h-11 items-center justify-center rounded-pill bg-olive-900 px-6 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-olive-500"
      >
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
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-md border p-3",
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

      <div className="flex min-w-0 flex-1 flex-col leading-snug">
        <p className="text-[13px] font-semibold text-olive-900">
          {item.product.name}
        </p>
        {isGift && (
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-leaf-700">
            <Gift className="h-2.5 w-2.5" aria-hidden="true" />
            Brinde da economia
          </p>
        )}
      </div>

      {/* Stepper inline */}
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Quantidade de ${item.product.name}`}>
        <button
          type="button"
          aria-label="Diminuir quantidade"
          onClick={handleDecrement}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-divider bg-paper-100 text-olive-700 transition-colors hover:border-olive-500 hover:bg-paper-50 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <Minus className="h-3 w-3" aria-hidden="true" />
        </button>
        <span
          className="w-5 text-center text-[13px] font-semibold tabular-nums text-olive-900"
          aria-live="polite"
          aria-label={`${item.quantity} unidades`}
        >
          {item.quantity}
        </span>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          onClick={handleIncrement}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-divider bg-paper-100 text-olive-700 transition-colors hover:border-olive-500 hover:bg-paper-50 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-olive-500"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Preço atualizado */}
      <span className="shrink-0 w-16 text-right text-[13px] font-semibold text-olive-900">
        {formatBRL(item.product.price_site * item.quantity)}
      </span>

      {/* Botão remover */}
      <button
        type="button"
        aria-label={`Remover ${item.product.name} do pedido`}
        onClick={() => removeItem(item.product.id)}
        className="flex shrink-0 h-7 w-7 items-center justify-center rounded-md text-olive-700/60 transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-2 focus-visible:outline-olive-500"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}
