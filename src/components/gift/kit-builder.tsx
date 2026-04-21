"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  MessageCircle,
  MapPin,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { mockProducts } from "@/lib/mock-products";
import { ProductPhoto } from "@/components/features/product-photo";
import { useCartStore } from "@/stores/cart-store";
import { findKitBySlug } from "@/lib/mock-gift-kits";
import {
  GIFT_CARD_MESSAGE_MAX,
  GIFT_PACKAGING_PRICE,
} from "@/types/gift-kit";
import type {
  GiftKitRecipient,
  GiftKitSlot,
} from "@/types/gift-kit";
import type { Product } from "@/types/product";

type Picks = Record<string, string[]>;

const EMPTY_RECIPIENT: GiftKitRecipient = {
  name: "",
  phone: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  cep: "",
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function isRecipientValid(r: GiftKitRecipient): boolean {
  return (
    r.name.trim().length >= 2 &&
    r.phone.replace(/\D/g, "").length >= 10 &&
    r.street.trim().length > 0 &&
    r.number.trim().length > 0 &&
    r.neighborhood.trim().length > 0 &&
    r.city.trim().length > 0 &&
    r.state.trim().length >= 2 &&
    r.cep.replace(/\D/g, "").length === 8
  );
}

type KitBuilderProps = {
  slug: string;
};

export function KitBuilder({ slug }: KitBuilderProps) {
  const router = useRouter();
  const addKit = useCartStore((s) => s.addKit);
  const kit = findKitBySlug(slug);

  const [stepIdx, setStepIdx] = useState(0);
  const [picks, setPicks] = useState<Picks>(() =>
    Object.fromEntries((kit?.slots ?? []).map((s) => [s.id, [] as string[]])),
  );
  const [packaging, setPackaging] = useState(false);
  const [cardMessage, setCardMessage] = useState("");
  const [sendToRecipient, setSendToRecipient] = useState(false);
  const [recipient, setRecipient] = useState<GiftKitRecipient>(EMPTY_RECIPIENT);

  if (!kit) return null;

  const totalSteps = kit.slots.length + 1;
  const isLastStep = stepIdx === totalSteps - 1;
  const currentSlot = stepIdx < kit.slots.length ? kit.slots[stepIdx] : null;

  const slotPicks = currentSlot ? picks[currentSlot.id] ?? [] : [];
  const slotFilled = currentSlot ? slotPicks.length === currentSlot.qty : true;

  const personalizationValid =
    !sendToRecipient || isRecipientValid(recipient);

  const canAdvance = currentSlot ? slotFilled : personalizationValid;

  const finalPrice = kit.price + (packaging ? GIFT_PACKAGING_PRICE : 0);

  function handleSlotClick(slot: GiftKitSlot, productId: string, isSoldOut: boolean) {
    if (isSoldOut) return;
    setPicks((prev) => {
      const current = prev[slot.id] ?? [];
      const next = [...current, productId];
      if (next.length > slot.qty) next.shift();
      return { ...prev, [slot.id]: next };
    });
  }

  function handleSlotDecrement(slotId: string, productId: string) {
    setPicks((prev) => {
      const current = prev[slotId] ?? [];
      const idx = current.lastIndexOf(productId);
      if (idx === -1) return prev;
      const next = [...current];
      next.splice(idx, 1);
      return { ...prev, [slotId]: next };
    });
  }

  function handleNext() {
    if (!canAdvance) return;
    if (!isLastStep) {
      setStepIdx((i) => i + 1);
      return;
    }
    // Final step — add to cart + redirect
    addKit({
      templateId: kit!.id,
      picks: kit!.slots.map((s) => ({
        slotId: s.id,
        productIds: picks[s.id] ?? [],
      })),
      packaging,
      cardMessage: cardMessage.trim() || undefined,
      recipient: sendToRecipient ? recipient : undefined,
    });
    router.push("/carrinho");
  }

  function handleBack() {
    if (stepIdx === 0) {
      router.push(`/presentear/${kit!.slug}`);
      return;
    }
    setStepIdx((i) => i - 1);
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-4 pb-24">
      <header className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex w-fit items-center gap-1 text-[12px] font-semibold text-olive-700 transition-colors hover:text-olive-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {stepIdx === 0 ? "Cancelar" : "Voltar"}
        </button>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-[18px] font-bold leading-tight text-olive-900 md:text-[22px]">
              {currentSlot ? currentSlot.label : "Finalização"}
            </h1>
            <span className="shrink-0 text-[11px] font-semibold text-olive-700">
              Passo {stepIdx + 1} de {totalSteps}
            </span>
          </div>

          <ProgressBar current={stepIdx + 1} total={totalSteps} />

          {currentSlot?.helper && (
            <p className="text-[12px] text-olive-700">{currentSlot.helper}</p>
          )}
        </div>
      </header>

      {currentSlot ? (
        <SlotStep
          slot={currentSlot}
          picks={slotPicks}
          onPick={(productId, isSoldOut) =>
            handleSlotClick(currentSlot, productId, isSoldOut)
          }
          onDecrement={(productId) =>
            handleSlotDecrement(currentSlot.id, productId)
          }
        />
      ) : (
        <PersonalizationStep
          packaging={packaging}
          onTogglePackaging={() => setPackaging((v) => !v)}
          cardMessage={cardMessage}
          onCardMessageChange={setCardMessage}
          sendToRecipient={sendToRecipient}
          onToggleRecipient={() => setSendToRecipient((v) => !v)}
          recipient={recipient}
          onRecipientChange={setRecipient}
        />
      )}

      <StickyCta
        canAdvance={canAdvance}
        isLastStep={isLastStep}
        slotCounter={
          currentSlot
            ? { current: slotPicks.length, total: currentSlot.qty }
            : null
        }
        finalPrice={finalPrice}
        onNext={handleNext}
      />
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Passo ${current} de ${total}`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-divider/60"
    >
      <div
        className="h-full rounded-full bg-terra-500 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Slot step ────────────────────────────────────────────────────────────
type SlotStepProps = {
  slot: GiftKitSlot;
  picks: string[];
  onPick: (productId: string, isSoldOut: boolean) => void;
  onDecrement: (productId: string) => void;
};

function SlotStep({ slot, picks, onPick, onDecrement }: SlotStepProps) {
  const eligible = useMemo(
    () =>
      slot.eligibleProductIds
        .map((id) => mockProducts.find((p) => p.id === id))
        .filter((p): p is Product => p !== undefined && p.active),
    [slot.eligibleProductIds],
  );

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {eligible.map((p) => {
        const count = picks.filter((id) => id === p.id).length;
        const isSoldOut = p.stock === 0;
        const slotFull = picks.length === slot.qty && count === 0;
        const canIncrement = !isSoldOut && !slotFull;
        return (
          <li key={p.id}>
            <article
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-paper-50 transition-colors",
                count > 0
                  ? "border-terra-500 shadow-sm"
                  : "border-divider md:hover:border-olive-500/40",
                isSoldOut && "opacity-60",
              )}
            >
              <button
                type="button"
                aria-label={`Adicionar ${p.name}`}
                onClick={() => onPick(p.id, isSoldOut)}
                disabled={!canIncrement}
                className="relative block aspect-[4/3] w-full overflow-hidden bg-paper-100 text-left disabled:cursor-not-allowed"
              >
                <ProductPhoto product={p} sizes="(max-width: 640px) 50vw, 25vw" />
                {count > 0 && (
                  <span
                    aria-label={`${count} selecionado${count > 1 ? "s" : ""}`}
                    className="absolute top-2 right-2 inline-flex h-7 min-w-[28px] items-center justify-center gap-0.5 rounded-pill bg-terra-500 px-1.5 text-[12px] font-bold text-paper-50 shadow-md"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" strokeWidth={3} />
                    {count > 1 && count}
                  </span>
                )}
                {isSoldOut && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-pill bg-olive-900/85 px-2 py-0.5 text-[10px] font-semibold text-paper-50">
                    Esgotado
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="text-[13px] font-semibold leading-snug text-olive-900">
                  {p.name}
                </h3>
                {p.contains && p.contains.length > 0 && (
                  <p className="text-[10px] text-olive-700">
                    contém {p.contains.slice(0, 2).join(", ")}
                  </p>
                )}

                {slot.qty > 1 && count > 0 && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDecrement(p.id)}
                      aria-label={`Remover um ${p.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-divider text-olive-900 hover:bg-paper-100"
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <span
                      aria-label={`Quantidade selecionada: ${count}`}
                      className="min-w-[1.5rem] text-center text-[13px] font-bold text-olive-900"
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPick(p.id, isSoldOut)}
                      disabled={!canIncrement}
                      aria-label={`Adicionar mais um ${p.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-divider text-olive-900 hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

// ── Personalization step ─────────────────────────────────────────────────
type PersonalizationStepProps = {
  packaging: boolean;
  onTogglePackaging: () => void;
  cardMessage: string;
  onCardMessageChange: (v: string) => void;
  sendToRecipient: boolean;
  onToggleRecipient: () => void;
  recipient: GiftKitRecipient;
  onRecipientChange: (r: GiftKitRecipient) => void;
};

function PersonalizationStep({
  packaging,
  onTogglePackaging,
  cardMessage,
  onCardMessageChange,
  sendToRecipient,
  onToggleRecipient,
  recipient,
  onRecipientChange,
}: PersonalizationStepProps) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleCard
        active={packaging}
        onToggle={onTogglePackaging}
        icon={Package}
        title="Embalagem de presente"
        subtitle={`fita + papel premium · +${formatBRL(GIFT_PACKAGING_PRICE)}`}
      />

      <section
        aria-labelledby="kit-msg-titulo"
        className="flex flex-col gap-2 rounded-xl border border-divider bg-paper-50 p-4"
      >
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-300/40 text-olive-900">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="kit-msg-titulo" className="text-[14px] font-bold text-olive-900">
              Mensagem no cartão
            </h2>
            <p className="text-[11px] text-olive-700">
              Impresso à mão e colocado junto dos doces. Opcional.
            </p>
          </div>
        </div>
        <textarea
          value={cardMessage}
          onChange={(e) =>
            onCardMessageChange(e.target.value.slice(0, GIFT_CARD_MESSAGE_MAX))
          }
          rows={3}
          maxLength={GIFT_CARD_MESSAGE_MAX}
          placeholder="Ex: Pra você, que cuidou de mim sem cobrar nada. Aproveita cada pedaço."
          className="w-full resize-none rounded-md border border-divider bg-paper-50 p-3 text-body-sm text-olive-900 placeholder:text-olive-700/50"
        />
        <div className="flex items-center justify-between text-[11px] text-olive-700">
          <span>Até {GIFT_CARD_MESSAGE_MAX} caracteres</span>
          <span>
            {cardMessage.length}/{GIFT_CARD_MESSAGE_MAX}
          </span>
        </div>
      </section>

      <ToggleCard
        active={sendToRecipient}
        onToggle={onToggleRecipient}
        icon={MapPin}
        title="Entregar pra outra pessoa"
        subtitle="a gente entrega direto no endereço de quem vai receber"
      />

      {sendToRecipient && (
        <RecipientForm value={recipient} onChange={onRecipientChange} />
      )}

      <p className="mt-1 text-center text-[11px] text-olive-700">
        Ao concluir, você vai pro carrinho pra revisar e fechar o pedido.
      </p>
    </div>
  );
}

// ── Toggle card ──────────────────────────────────────────────────────────
type ToggleCardProps = {
  active: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
};

function ToggleCard({
  active,
  onToggle,
  icon: Icon,
  title,
  subtitle,
}: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 bg-paper-50 p-4 text-left transition-colors",
        active ? "border-terra-500 shadow-sm" : "border-divider md:hover:border-olive-500/40",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          active ? "bg-terra-500 text-paper-50" : "bg-sage-300/40 text-olive-900",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex-1">
        <p className="text-[14px] font-bold text-olive-900">{title}</p>
        <p className="text-[11px] text-olive-700">{subtitle}</p>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          active ? "bg-terra-500" : "bg-divider",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-paper-50 shadow transition-transform",
            active ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

// ── Recipient form ───────────────────────────────────────────────────────
function RecipientForm({
  value,
  onChange,
}: {
  value: GiftKitRecipient;
  onChange: (r: GiftKitRecipient) => void;
}) {
  const set = <K extends keyof GiftKitRecipient>(k: K, v: GiftKitRecipient[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <section
      aria-label="Dados do destinatário"
      className="flex flex-col gap-3 rounded-xl border border-divider bg-paper-50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Nome de quem recebe"
          value={value.name}
          onChange={(v) => set("name", v)}
          placeholder="Ex: Ana Ribeiro"
        />
        <TextField
          label="WhatsApp de quem recebe"
          value={value.phone}
          onChange={(v) => set("phone", formatPhone(v))}
          placeholder="(31) 99999-9999"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
        <TextField
          label="Rua"
          value={value.street}
          onChange={(v) => set("street", v)}
          placeholder="Ex: Rua dos Guajajaras"
        />
        <TextField
          label="Número"
          value={value.number}
          onChange={(v) => set("number", v)}
          placeholder="123"
        />
      </div>

      <TextField
        label="Complemento (opcional)"
        value={value.complement ?? ""}
        onChange={(v) => set("complement", v)}
        placeholder="Ex: Apto 203"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Bairro"
          value={value.neighborhood}
          onChange={(v) => set("neighborhood", v)}
          placeholder="Centro"
        />
        <TextField
          label="CEP"
          value={value.cep}
          onChange={(v) => set("cep", formatCep(v))}
          placeholder="30000-000"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[3fr_1fr]">
        <TextField
          label="Cidade"
          value={value.city}
          onChange={(v) => set("city", v)}
          placeholder="Belo Horizonte"
        />
        <TextField
          label="UF"
          value={value.state}
          onChange={(v) => set("state", v.toUpperCase().slice(0, 2))}
          placeholder="MG"
        />
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-10 w-full rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/50"
      />
    </label>
  );
}

// ── Sticky CTA ──────────────────────────────────────────────────────────
type StickyCtaProps = {
  canAdvance: boolean;
  isLastStep: boolean;
  slotCounter: { current: number; total: number } | null;
  finalPrice: number;
  onNext: () => void;
};

function StickyCta({
  canAdvance,
  isLastStep,
  slotCounter,
  finalPrice,
  onNext,
}: StickyCtaProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-paper-50/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(43,50,16,0.25)] backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        {slotCounter ? (
          <span className="text-[11px] text-olive-700">
            {slotCounter.current} de {slotCounter.total} escolhidos
          </span>
        ) : (
          <span className="text-[11px] text-olive-700">
            Total: <strong className="text-olive-900">{formatBRL(finalPrice)}</strong>
          </span>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            "ml-auto inline-flex h-11 items-center gap-2 rounded-pill px-5 text-[13px] font-bold transition-transform active:scale-[0.98]",
            canAdvance
              ? "bg-terra-500 text-paper-50 shadow-sm"
              : "cursor-not-allowed bg-sage-300 text-paper-50/80",
          )}
        >
          {isLastStep ? "Adicionar ao carrinho" : "Próximo"}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

