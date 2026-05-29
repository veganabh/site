"use client";

import { useState } from "react";
import { MapPin, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { useDeliveryStore } from "@/stores/delivery-store";

type DeliveryGateProps = {
  className?: string;
  /**
   * "bar" (default) = sticky bar paper-100 full-width.
   * "card" = bloco compacto pra encaixar dentro de hero escuro (olive-900).
   */
  variant?: "bar" | "card";
};

/**
 * Barra fina de consulta de CEP que cobre o gap de confiança:
 * "entregam aqui?" + "quando chega?" antes do usuário montar carrinho.
 * Mostra 3 estados: vazio (input), OK (área coberta), fora de área.
 */
export function DeliveryGate({ className, variant = "bar" }: DeliveryGateProps) {
  const quote = useDeliveryStore((s) => s.quote);
  const setCep = useDeliveryStore((s) => s.setCep);
  const clear = useDeliveryStore((s) => s.clear);

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await setCep(input);
    if (result) {
      setEditing(false);
      setInput("");
    }
  };

  const showForm = !quote || editing;

  if (variant === "card") {
    return (
      <section
        aria-label="Consulta de entrega"
        className={cn(
          "flex flex-col justify-center gap-1.5 rounded-lg border border-divider bg-paper-50 px-3 py-2.5",
          className,
        )}
      >
        <div className="inline-flex items-center gap-1 text-micro font-semibold tracking-wide text-olive-700 uppercase">
          <MapPin className="h-3 w-3 text-olive-700" aria-hidden="true" />
          Entregamos aí?
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <label htmlFor="delivery-cep-card" className="sr-only">
              CEP de entrega
            </label>
            <input
              id="delivery-cep-card"
              type="text"
              inputMode="numeric"
              placeholder="seu CEP"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={9}
              className="min-w-0 flex-1 rounded-sm border border-olive-900/15 bg-paper-50 px-2 py-1 text-caption text-olive-900 placeholder:text-olive-500 focus:border-olive-700/50 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-sm bg-olive-900 px-2.5 py-1 text-micro font-semibold text-paper-50 transition-colors hover:bg-olive-700"
            >
              Consultar
            </button>
            {quote && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setInput("");
                }}
                aria-label="Cancelar"
                className="shrink-0 rounded-sm p-0.5 text-olive-700 hover:bg-paper-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </form>
        )}

        {!showForm && quote && quote.covered && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-leaf-700">
              <Check className="h-3 w-3" aria-hidden="true" />
              {quote.neighborhood}
            </span>
            <span className="inline-flex items-center gap-1 text-micro text-olive-700">
              <Clock className="h-3 w-3" aria-hidden="true" />~{quote.eta}
            </span>
            <span className="text-micro text-olive-700">
              ·{" "}
              {quote.shippingFee === 0 ? (
                <span className="font-semibold text-leaf-700">frete grátis</span>
              ) : (
                <>frete {formatBRL(quote.shippingFee)}</>
              )}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto text-micro font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
            >
              trocar
            </button>
          </div>
        )}

        {!showForm && quote && !quote.covered && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="inline-flex items-center gap-1 text-caption font-semibold text-terra-700">
              <X className="h-3 w-3" aria-hidden="true" />
              Fora da área
            </span>
            <span className="truncate text-micro text-olive-700">CEP {quote.cep}</span>
            <button
              type="button"
              onClick={() => {
                clear();
                setEditing(false);
              }}
              className="ml-auto text-micro font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
            >
              tentar outro
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Consulta de entrega"
      className={cn(
        "sticky top-[72px] z-10 -mx-3 flex flex-wrap items-center gap-2 border-b border-divider bg-paper-100/95 px-3 py-1.5 backdrop-blur md:-mx-5 md:px-5",
        className,
      )}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-olive-700" aria-hidden="true" />

      {showForm && (
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <label htmlFor="delivery-cep" className="sr-only">
            CEP de entrega
          </label>
          <span className="shrink-0 text-caption font-medium text-olive-900">Entregamos aí?</span>
          <input
            id="delivery-cep"
            type="text"
            inputMode="numeric"
            placeholder="seu CEP"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={9}
            className="max-w-[140px] min-w-0 flex-1 rounded-sm border border-olive-900/20 bg-paper-50 px-2 py-0.5 text-caption text-olive-900 placeholder:text-olive-500 focus:border-olive-500/50 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-sm bg-olive-900 px-2.5 py-0.5 text-caption font-semibold text-paper-50 transition-colors hover:bg-olive-700"
          >
            Consultar
          </button>
          {quote && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setInput("");
              }}
              aria-label="Cancelar"
              className="shrink-0 rounded-sm p-0.5 text-olive-700 hover:bg-paper-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
      )}

      {!showForm && quote && quote.covered && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-caption font-semibold text-leaf-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            {quote.neighborhood}
          </span>
          <span className="inline-flex items-center gap-1 text-caption text-olive-900">
            <Clock className="h-3 w-3 text-olive-700" aria-hidden="true" />~{quote.eta}
          </span>
          <span className="text-caption text-olive-700">
            ·{" "}
            {quote.shippingFee === 0 ? (
              <span className="font-semibold text-leaf-700">frete grátis</span>
            ) : (
              <>frete {formatBRL(quote.shippingFee)}</>
            )}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto rounded-sm text-micro font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
          >
            trocar CEP
          </button>
        </div>
      )}

      {!showForm && quote && !quote.covered && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-caption font-semibold text-terra-700">
            <X className="h-3 w-3" aria-hidden="true" />
            Fora da área ainda
          </span>
          <span className="truncate text-caption text-olive-700">
            CEP {quote.cep} — avise pra receber aviso quando chegarmos aí.
          </span>
          <button
            type="button"
            onClick={() => {
              clear();
              setEditing(false);
            }}
            className="ml-auto rounded-sm text-micro font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
          >
            tentar outro
          </button>
        </div>
      )}
    </section>
  );
}
