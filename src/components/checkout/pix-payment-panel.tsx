"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { captureEvent } from "@/lib/analytics";
import { Card } from "@/components/ui/card";

type Props = {
  orderId: string;
  amount: number; // reais
  brCode: string;
  brCodeBase64: string;
  expiresAt: string; // ISO
  initialStatus: "pending" | "paid" | "failed" | "refunded";
  devMode: boolean;
};

type PollResponse = {
  status?: "pending" | "paid" | "failed" | "refunded" | "missing";
  orderPaymentStatus?: string;
  paidAt?: string | null;
  gatewayError?: boolean;
};

/**
 * Painel PIX da página /obrigado. Renderiza QR + copia-cola + countdown +
 * polling no endpoint `/api/payments/[orderId]/status`.
 *
 * Polling estratégico: 4s intervalo, para após status terminal ou quando QR
 * expira. Aborta requests in-flight ao desmontar (evita setState em
 * componente desmontado em refresh manual).
 */
export function PixPaymentPanel({
  orderId,
  amount,
  brCode,
  brCodeBase64,
  expiresAt,
  initialStatus,
  devMode,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [gatewayError, setGatewayError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const expiresAtMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const remainingMs = Math.max(expiresAtMs - now, 0);
  const expired = remainingMs === 0 && status === "pending";

  // AddPaymentInfo (Meta Pixel): PIX gerado e exibido = info de pagamento
  // apresentada. Dispara uma vez ao montar o painel.
  useEffect(() => {
    captureEvent("payment_info_added", { value: amount, orderId });
  }, [orderId, amount]);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`/api/payments/${orderId}/status`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as PollResponse;
      setGatewayError(Boolean(data.gatewayError));

      if (data.status && data.status !== "missing") {
        setStatus(data.status);
      }
      if (data.status === "paid") {
        router.refresh();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[pix-panel] polling:", err);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (status !== "pending" || expired) return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh, status, expired]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.error("[pix-panel] copy:", err);
    }
  }

  if (status === "paid") {
    return (
      <section
        aria-label="Pagamento confirmado"
        className="flex flex-col items-center gap-3 rounded-sm border border-leaf-500/30 bg-leaf-500/5 p-5 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf-500/15">
          <Check className="h-6 w-6 text-leaf-700" aria-hidden="true" />
        </span>
        <p className="text-body-sm font-semibold text-olive-900">Pagamento confirmado</p>
        <p className="text-caption text-olive-700">
          A Veg.ana já está preparando seu pedido. Você recebe atualizações no WhatsApp.
        </p>
      </section>
    );
  }

  if (status === "failed" || status === "refunded") {
    return (
      <Card
        as="section"
        aria-label="Cobrança PIX expirada"
        padding="md"
        className="flex flex-col items-center gap-2 text-center"
      >
        <AlertTriangle className="h-6 w-6 text-terra-700" aria-hidden="true" />
        <p className="text-body-sm font-semibold text-olive-900">
          PIX automático indisponível no momento
        </p>
        <p className="text-caption text-olive-700">
          A Veg.ana vai te chamar no WhatsApp pra enviar o PIX manualmente ou combinar pagamento na
          entrega.
        </p>
      </Card>
    );
  }

  return (
    <Card
      as="section"
      aria-label="Pagamento via PIX"
      padding="none"
      className="flex flex-col gap-4 p-4 md:p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-body-sm font-semibold text-olive-900">Pague com PIX</h2>
        <p className="text-caption text-olive-700">
          Total <strong className="tabular-nums">{formatBRL(amount)}</strong>. Confirmação
          automática em alguns segundos.
        </p>
        {devMode ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-terra-700/10 px-2 py-0.5 text-micro font-semibold text-terra-700">
            ambiente de teste
          </span>
        ) : null}
      </header>

      <div className="flex flex-col items-center gap-3">
        <Card aria-hidden={expired} padding="none" className="p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brCodeBase64}
            alt="QR Code para pagamento via PIX"
            className="h-44 w-44 rounded-sm"
          />
        </Card>

        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-caption text-olive-700"
        >
          {expired ? (
            <span className="font-semibold text-terra-700">
              O QR expirou. Chame a Veg.ana no WhatsApp pra gerar um novo.
            </span>
          ) : (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-leaf-700" aria-hidden="true" />
              <span>
                Aguardando pagamento — expira em{" "}
                <strong className="tabular-nums">{formatRemaining(remainingMs)}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pix-copy-paste" className="text-caption font-semibold text-olive-900">
          Ou copie o código PIX
        </label>
        <div className="flex items-stretch gap-2">
          <input
            id="pix-copy-paste"
            readOnly
            value={brCode}
            className="min-w-0 flex-1 rounded-full border border-divider bg-paper-50 px-3 text-caption text-olive-700 tabular-nums outline-none focus-visible:border-leaf-700"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-olive-900 px-4 text-caption font-semibold text-paper-50 transition-colors hover:bg-olive-700"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                copiar
              </>
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={refresh}
        className="inline-flex h-10 items-center justify-center gap-1.5 self-start rounded-full border border-divider px-3 text-caption font-semibold text-olive-900 transition-colors hover:border-leaf-700 hover:text-leaf-700"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        verificar agora
      </button>

      {gatewayError ? (
        <p className="text-micro text-terra-700">
          Não conseguimos checar o status agora. A confirmação pode demorar alguns segundos a mais.
        </p>
      ) : null}
    </Card>
  );
}

function formatRemaining(ms: number): string {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
