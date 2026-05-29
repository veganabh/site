"use client";

import { useState, useRef } from "react";
import { Search, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { geocode, fallbackQuoteByPrefix, GeocodeError } from "@/lib/geocode";
import { useRingsStore } from "@/stores/rings-store";
import type { DeliveryRing } from "@/types/delivery-ring";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TestResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "covered"; ring: DeliveryRing; neighborhood?: string; estimate?: boolean }
  | { status: "uncovered"; neighborhood?: string }
  | { status: "invalid" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCepInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CepTester() {
  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");
  const [result, setResult] = useState<TestResult>({ status: "idle" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookupByLatLng = useRingsStore((s) => s.lookupByLatLng);

  async function runTest(cepValue: string, numberValue: string) {
    const digits = cepValue.replace(/\D/g, "");
    if (digits.length !== 8) {
      setResult({ status: "idle" });
      return;
    }

    setResult({ status: "loading" });

    try {
      const geo = await geocode(digits, numberValue || undefined);
      const ring = lookupByLatLng(geo.lat, geo.lng);

      if (ring) {
        setResult({
          status: "covered",
          ring,
          neighborhood: geo.neighborhood,
          estimate: false,
        });
      } else {
        setResult({ status: "uncovered", neighborhood: geo.neighborhood });
      }
    } catch (err) {
      // Fallback offline
      if (err instanceof GeocodeError || err instanceof Error) {
        const fb = fallbackQuoteByPrefix(digits);
        if (fb.covered) {
          // Precisa de um ring aproximado para exibir o resultado
          const approxRing = useRingsStore
            .getState()
            .rings.find((r) => r.active && r.fee === fb.shippingFee);

          if (approxRing) {
            setResult({
              status: "covered",
              ring: { ...approxRing, fee: fb.shippingFee, etaMin: fb.etaMin, etaMax: fb.etaMax },
              neighborhood: fb.neighborhood,
              estimate: true,
            });
          } else {
            // Cria anel virtual para exibição
            const virtualRing: DeliveryRing = {
              id: "fallback",
              order: 0,
              innerRadiusM: 0,
              outerRadiusM: 0,
              fee: fb.shippingFee,
              etaMin: fb.etaMin,
              etaMax: fb.etaMax,
              active: true,
              label: "estimativa",
            };
            setResult({
              status: "covered",
              ring: virtualRing,
              neighborhood: fb.neighborhood,
              estimate: true,
            });
          }
        } else {
          setResult({ status: "uncovered" });
        }
      } else {
        setResult({ status: "invalid" });
      }
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCepInput(e.target.value);
    setCep(formatted);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runTest(formatted, number).catch(() => null);
    }, 500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runTest(cep, number).catch(() => null);
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body-sm font-semibold text-olive-900">Testar cobertura por CEP</h3>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        {/* Input CEP */}
        <div className="flex min-w-[140px] flex-1 flex-col gap-1">
          <label htmlFor="cep-tester-cep" className="text-micro font-medium text-olive-700">
            CEP
          </label>
          <input
            id="cep-tester-cep"
            type="text"
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            onChange={handleCepChange}
            maxLength={9}
            className="rounded-sm border border-olive-900/20 bg-paper-50 px-2.5 py-1.5 text-body-sm text-olive-900 placeholder:text-olive-500 focus:border-olive-700 focus:outline-none"
          />
        </div>

        {/* Input número (opcional) */}
        <div className="flex w-20 flex-col gap-1">
          <label htmlFor="cep-tester-number" className="text-micro font-medium text-olive-700">
            Nº (opcional)
          </label>
          <input
            id="cep-tester-number"
            type="text"
            inputMode="numeric"
            placeholder="202"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="rounded-sm border border-olive-900/20 bg-paper-50 px-2.5 py-1.5 text-body-sm text-olive-900 placeholder:text-olive-500 focus:border-olive-700 focus:outline-none"
          />
        </div>

        {/* Botão */}
        <button
          type="submit"
          disabled={result.status === "loading"}
          aria-label="Verificar cobertura de CEP"
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-caption font-semibold text-paper-50 transition-colors",
            result.status === "loading"
              ? "cursor-wait bg-olive-900/50"
              : "bg-olive-900 hover:bg-olive-700",
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Verificar
        </button>
      </form>

      {/* Resultado */}
      {result.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-body-sm text-olive-700"
        >
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-olive-900/30 border-t-olive-900" />
          Verificando...
        </div>
      )}

      {result.status === "covered" && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex flex-col gap-1 rounded-sm border px-3 py-2.5",
            result.estimate
              ? "border-terra-500/30 bg-terra-500/5"
              : "border-leaf-500/30 bg-leaf-500/5",
          )}
        >
          <div className="flex items-center gap-1.5 text-body-sm font-semibold text-leaf-700">
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            {result.neighborhood ? `CEP ${cep} → ${result.neighborhood}` : `CEP ${cep}`}
            {result.ring.order > 0 && ` · Anel ${result.ring.order}`}
          </div>
          <p className="text-caption text-olive-700">
            {result.ring.fee === 0 ? (
              <span className="font-semibold text-leaf-700">Frete grátis</span>
            ) : (
              <>Frete {formatBRL(result.ring.fee)}</>
            )}
            {" · "}
            {result.ring.etaMin}–{result.ring.etaMax} min
          </p>
          {result.estimate && (
            <p className="flex items-center gap-1 text-micro text-terra-700">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              Estimativa — conexão com mapa indisponível. Valor pode ajustar ao confirmar pedido.
            </p>
          )}
        </div>
      )}

      {result.status === "uncovered" && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-sm border border-terra-500/30 bg-terra-500/5 px-3 py-2.5 text-body-sm text-terra-700"
        >
          <X className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Fora da área de entrega.</strong> CEP {cep}{" "}
            {result.neighborhood ? `(${result.neighborhood})` : ""}
          </span>
        </div>
      )}

      {result.status === "invalid" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-sm border border-divider bg-paper-100 px-3 py-2.5 text-body-sm text-olive-700"
        >
          CEP inválido. Verifique e tente novamente.
        </div>
      )}
    </div>
  );
}
