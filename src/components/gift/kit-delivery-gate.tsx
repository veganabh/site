"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  MapPin,
  Heart,
  Gift as GiftIcon,
  Check,
  X,
  Clock,
  Loader2,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { useDeliveryStore } from "@/stores/delivery-store";
import type { DeliveryQuote } from "@/stores/delivery-store";
import type { GiftKitTemplate } from "@/types/gift-kit";

type KitDeliveryGateProps = {
  open: boolean;
  kit: GiftKitTemplate | null;
  onClose: () => void;
};

type Mode = "choose" | "cep";

function formatCepInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildBuilderUrl(
  slug: string,
  intent: "self" | "gift",
  quote: DeliveryQuote,
): string {
  const params = new URLSearchParams();
  params.set("to", intent);
  params.set("cep", quote.cep);
  if (quote.neighborhood) params.set("bairro", quote.neighborhood);
  if (quote.city) params.set("cidade", quote.city);
  params.set("fee", String(quote.shippingFee));
  if (quote.eta) params.set("eta", quote.eta);
  return `/presentear/${slug}/montar?${params.toString()}`;
}

export function KitDeliveryGate({ open, kit, onClose }: KitDeliveryGateProps) {
  const router = useRouter();
  const ownQuote = useDeliveryStore((s) => s.quote);
  const setCep = useDeliveryStore((s) => s.setCep);
  const lookupCep = useDeliveryStore((s) => s.lookupCep);
  const loading = useDeliveryStore((s) => s.loading);
  const [localLoading, setLocalLoading] = useState(false);

  const [mode, setMode] = useState<Mode>("choose");
  const [intent, setIntent] = useState<"self" | "gift">("gift");
  const [cepInput, setCepInput] = useState("");
  const [localQuote, setLocalQuote] = useState<DeliveryQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!kit) return null;

  function resetAndClose() {
    setMode("choose");
    setCepInput("");
    setLocalQuote(null);
    setError(null);
    onClose();
  }

  function proceedWithQuote(selectedIntent: "self" | "gift", quote: DeliveryQuote) {
    router.push(buildBuilderUrl(kit!.slug, selectedIntent, quote));
    resetAndClose();
  }

  function handleChooseSelf() {
    if (ownQuote?.covered) {
      proceedWithQuote("self", ownQuote);
      return;
    }
    setIntent("self");
    setMode("cep");
  }

  function handleChooseGift() {
    setIntent("gift");
    setMode("cep");
  }

  async function handleSubmitCep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const digits = cepInput.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Digite um CEP completo.");
      return;
    }
    setLocalLoading(true);
    try {
      // intent=self → persistir no store (é o CEP do cliente).
      // intent=gift → só validar, não sobrescrever quote própria.
      const result = intent === "self" ? await setCep(cepInput) : await lookupCep(cepInput);
      if (!result) {
        setError("Não consegui validar esse CEP. Tente de novo.");
        return;
      }
      setLocalQuote(result);
      if (result.covered) {
        proceedWithQuote(intent, result);
      }
    } finally {
      setLocalLoading(false);
    }
  }

  const activeQuote = localQuote;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-olive-900/50 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-divider bg-paper-50 p-5 shadow-lg",
            "focus:outline-none",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <Dialog.Title className="text-[16px] font-bold text-olive-900">
                {mode === "choose" ? "Pra onde vai esse kit?" : "Qual o CEP?"}
              </Dialog.Title>
              <Dialog.Description className="text-[12px] text-olive-700">
                {mode === "choose"
                  ? "A gente confere se chega aí antes da montagem."
                  : intent === "gift"
                    ? "CEP de quem vai receber o presente."
                    : "Seu CEP pra entrega."}
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              aria-label="Fechar"
              className="rounded-sm p-1 text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {mode === "choose" && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleChooseSelf}
                className="flex items-center gap-3 rounded-xl border-2 border-divider bg-paper-50 p-3 text-left transition-colors hover:border-terra-500/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra-500/15 text-terra-700">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-bold text-olive-900">Pra mim</span>
                  <span className="block text-[11px] text-olive-700">
                    {ownQuote?.covered
                      ? `${ownQuote.neighborhood} · ${
                          ownQuote.shippingFee === 0
                            ? "frete grátis"
                            : `frete ${formatBRL(ownQuote.shippingFee)}`
                        }`
                      : "Usa seu endereço"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-olive-700" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleChooseGift}
                className="flex items-center gap-3 rounded-xl border-2 border-divider bg-paper-50 p-3 text-left transition-colors hover:border-terra-500/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf-500/15 text-leaf-700">
                  <GiftIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[14px] font-bold text-olive-900">
                    Pra outra pessoa
                  </span>
                  <span className="block text-[11px] text-olive-700">
                    Endereço de quem vai receber
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-olive-700" aria-hidden="true" />
              </button>

              <p className="mt-1 text-center text-[11px] text-olive-700">
                Sem CEP válido, a gente não consegue garantir a entrega.
              </p>
            </div>
          )}

          {mode === "cep" && (
            <div className="flex flex-col gap-3">
              <form onSubmit={handleSubmitCep} className="flex items-center gap-2">
                <label htmlFor="kit-gate-cep" className="sr-only">
                  CEP
                </label>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-paper-100 text-olive-700"
                  aria-hidden="true"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  id="kit-gate-cep"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="00000-000"
                  value={cepInput}
                  onChange={(e) => setCepInput(formatCepInput(e.target.value))}
                  maxLength={9}
                  className="h-10 min-w-0 flex-1 rounded-md border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 placeholder:text-olive-700/50 focus:border-olive-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || localLoading}
                  className={cn(
                    "h-10 shrink-0 rounded-md bg-olive-900 px-4 text-[13px] font-bold text-paper-50 transition",
                    loading || localLoading ? "opacity-60" : "hover:bg-olive-700",
                  )}
                >
                  {loading || localLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    "Consultar"
                  )}
                </button>
              </form>

              {error && (
                <p role="alert" className="text-[12px] font-medium text-terra-700">
                  {error}
                </p>
              )}

              {activeQuote && !activeQuote.covered && (
                <div className="flex flex-col gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-terra-700">
                    <X className="h-4 w-4" aria-hidden="true" />
                    Ainda não entregamos em {activeQuote.neighborhood || activeQuote.cep}
                  </div>
                  <p className="text-[11px] text-olive-700">
                    A gente amplia a área aos poucos. Avisa pelo WhatsApp que a gente te chama
                    quando chegar aí.
                  </p>
                  <a
                    href="https://wa.me/5531999999999?text=Oi!%20Meu%20CEP%20não%20é%20atendido%20ainda,%20quero%20ser%20avisada%20quando%20chegar%20aí."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-pill bg-leaf-700 px-3 py-1 text-[12px] font-semibold text-paper-50 self-start"
                  >
                    <MessageCircle className="h-3 w-3" aria-hidden="true" />
                    Avisar no WhatsApp
                  </a>
                </div>
              )}

              {activeQuote && activeQuote.covered && (
                <div className="flex flex-col gap-2 rounded-xl border border-leaf-500/30 bg-leaf-500/5 p-3">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-leaf-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Entregamos em {activeQuote.neighborhood}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-olive-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" /> ~{activeQuote.eta}
                    </span>
                    <span>
                      {activeQuote.shippingFee === 0 ? (
                        <span className="font-semibold text-leaf-700">frete grátis</span>
                      ) : (
                        <>frete {formatBRL(activeQuote.shippingFee)}</>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setMode("choose");
                  setLocalQuote(null);
                  setError(null);
                  setCepInput("");
                }}
                className="self-start text-[11.5px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
              >
                voltar
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
