"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { MapPin, Check, X, Clock, Loader2, MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { STORE_LOCATION } from "@/lib/store-location";
import { useDeliveryStore } from "@/stores/delivery-store";
import type { DeliveryQuote } from "@/stores/delivery-store";
import { useCartStore } from "@/stores/cart-store";
import type { GiftKitTemplate } from "@/types/gift-kit";

type KitDeliveryGateProps = {
  open: boolean;
  kit: GiftKitTemplate | null;
  onClose: () => void;
};

function formatCepInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function buildBuilderUrl(slug: string, quote: DeliveryQuote): string {
  const params = new URLSearchParams();
  params.set("to", "gift");
  params.set("cep", quote.cep);
  if (quote.neighborhood) params.set("bairro", quote.neighborhood);
  if (quote.city) params.set("cidade", quote.city);
  params.set("fee", String(quote.shippingFee));
  if (quote.eta) params.set("eta", quote.eta);
  return `/presentear/${slug}/montar?${params.toString()}`;
}

export function KitDeliveryGate({ open, kit, onClose }: KitDeliveryGateProps) {
  const router = useRouter();
  const lookupCep = useDeliveryStore((s) => s.lookupCep);
  const loading = useDeliveryStore((s) => s.loading);
  const cartItems = useCartStore((s) => s.items);
  const cartKits = useCartStore((s) => s.kits);
  const clearCart = useCartStore((s) => s.clearCart);
  const [localLoading, setLocalLoading] = useState(false);

  const [cepInput, setCepInput] = useState("");
  const [localQuote, setLocalQuote] = useState<DeliveryQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cartUnitCount =
    cartItems.reduce((acc, i) => acc + i.quantity, 0) + cartKits.length;

  if (!kit) return null;

  function resetAndClose() {
    setCepInput("");
    setLocalQuote(null);
    setError(null);
    onClose();
  }

  function proceedWithQuote(quote: DeliveryQuote) {
    router.push(buildBuilderUrl(kit!.slug, quote));
    resetAndClose();
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
      // Presente sempre vai pra terceiro — só valida, não sobrescreve quote do cliente.
      const result = await lookupCep(cepInput);
      if (!result) {
        setError("Não consegui validar esse CEP. Tente de novo.");
        return;
      }
      setLocalQuote(result);
      if (result.covered) {
        proceedWithQuote(result);
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
                Pra onde vai esse kit?
              </Dialog.Title>
              <Dialog.Description className="text-[12px] text-olive-700">
                CEP de quem vai receber o presente.
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

          <div className="flex flex-col gap-3">
              {cartUnitCount > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-terra-500/30 bg-terra-500/5 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-terra-700">
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    Você tem {cartUnitCount} {cartUnitCount === 1 ? "item" : "itens"} no carrinho
                  </div>
                  <p className="text-[11px] text-olive-700">
                    Presente é contexto separado — vai pra outra pessoa, outro endereço. Esvaziar o
                    carrinho ajuda a não misturar pedido seu com kit de presente.
                  </p>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1.5 self-start rounded-pill bg-terra-500 px-3 py-1 text-[12px] font-semibold text-paper-50 transition hover:bg-terra-700"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Esvaziar carrinho
                  </button>
                </div>
              )}

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
                    href={`https://wa.me/${STORE_LOCATION.whatsappNumber}?text=Oi!%20Meu%20CEP%20não%20é%20atendido%20ainda,%20quero%20ser%20avisada%20quando%20chegar%20aí.`}
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
                onClick={resetAndClose}
                className="self-start text-[11.5px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
              >
                cancelar
              </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
