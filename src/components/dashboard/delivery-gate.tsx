"use client";

import { useState } from "react";
import { MapPin, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { useDeliveryStore } from "@/stores/delivery-store";

type DeliveryGateProps = {
  className?: string;
};

/**
 * Barra fina de consulta de CEP que cobre o gap de confiança:
 * "entregam aqui?" + "quando chega?" antes do usuário montar carrinho.
 * Mostra 3 estados: vazio (input), OK (área coberta), fora de área.
 */
export function DeliveryGate({ className }: DeliveryGateProps) {
  const quote = useDeliveryStore((s) => s.quote);
  const setCep = useDeliveryStore((s) => s.setCep);
  const clear = useDeliveryStore((s) => s.clear);

  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = setCep(input);
    if (result) {
      setEditing(false);
      setInput("");
    }
  };

  const showForm = !quote || editing;

  return (
    <section
      aria-label="Consulta de entrega"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-divider bg-paper-100 px-3 py-2",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0 text-olive-700" aria-hidden="true" />

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 min-w-0">
          <label htmlFor="delivery-cep" className="sr-only">
            CEP de entrega
          </label>
          <span className="shrink-0 text-[12px] font-medium text-olive-900">
            Entregamos aí?
          </span>
          <input
            id="delivery-cep"
            type="text"
            inputMode="numeric"
            placeholder="seu CEP"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={9}
            className="min-w-0 flex-1 max-w-[180px] rounded-sm border border-olive-900/20 bg-paper-50 px-2 py-1 text-[12px] text-olive-900 placeholder:text-olive-500 focus:border-olive-500/50 focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-sm bg-olive-900 px-3 py-1 text-[12px] font-semibold text-paper-50 transition-colors hover:bg-olive-700"
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
              className="shrink-0 rounded-sm p-1 text-olive-700 hover:bg-paper-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
      )}

      {!showForm && quote && quote.covered && (
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-pill bg-leaf-500/15 px-2 py-0.5 text-[11px] font-semibold text-leaf-700">
            <Check className="h-3 w-3" aria-hidden="true" />
            Entregamos em {quote.neighborhood}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-olive-900">
            <Clock className="h-3 w-3 text-olive-700" aria-hidden="true" />
            ~{quote.eta}
          </span>
          <span className="text-[12px] text-olive-700">
            ·{" "}
            {quote.shippingFee === 0 ? (
              <span className="font-semibold text-leaf-700">entrega grátis</span>
            ) : (
              <>frete {formatBRL(quote.shippingFee)}</>
            )}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[11px] text-olive-700">CEP {quote.cep}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-sm px-2 py-0.5 text-[11px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
            >
              trocar
            </button>
          </div>
        </div>
      )}

      {!showForm && quote && !quote.covered && (
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-pill bg-terra-500/15 px-2 py-0.5 text-[11px] font-semibold text-terra-700">
            <X className="h-3 w-3" aria-hidden="true" />
            Ainda não entregamos aí
          </span>
          <span className="text-[12px] text-olive-700">
            CEP {quote.cep} fora da área de BH coberta — nos avise se quiser receber um aviso
            quando chegarmos aí.
          </span>
          <button
            type="button"
            onClick={() => {
              clear();
              setEditing(false);
            }}
            className="ml-auto rounded-sm px-2 py-0.5 text-[11px] font-medium text-olive-700 underline underline-offset-2 hover:text-olive-900"
          >
            tentar outro
          </button>
        </div>
      )}
    </section>
  );
}
