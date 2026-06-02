"use client";

/**
 * Peças visuais do wizard de checkout (DS v1.1) — indicador de passos + barra
 * de CTA fixa no mobile. Modelado no checkout diário (CheckoutSteps) pra manter
 * o MESMO padrão entre pedido do dia e encomenda.
 *
 * Genérico por índice: serve qualquer fluxo com N passos.
 */

import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

export type WizardStep = { key: string; label: string };

export function WizardStepIndicator({
  steps,
  currentIndex,
  onSelect,
}: {
  steps: readonly WizardStep[];
  currentIndex: number;
  /** Permite voltar pra um passo já concluído. */
  onSelect?: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Etapas do checkout"
      className="flex items-center justify-center gap-1.5 text-caption"
    >
      {steps.map((s, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        const clickable = isDone && !!onSelect;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(idx)}
              aria-current={isActive ? "step" : undefined}
              aria-label={s.label}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-full font-semibold transition-all",
                isActive && "bg-olive-900 px-2.5 text-paper-50",
                isDone && "cursor-pointer px-1 text-olive-900 hover:bg-paper-100",
                !isActive && !isDone && "px-1 text-olive-700",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-micro font-bold",
                  isActive && "bg-paper-50 text-olive-900",
                  isDone && "bg-leaf-500 text-paper-50",
                  !isActive && !isDone && "bg-paper-100 text-olive-700",
                )}
              >
                {isDone ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  idx + 1
                )}
              </span>
              {isActive && <span>{s.label}</span>}
            </button>
            {idx < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn("h-px w-4 md:w-6", idx < currentIndex ? "bg-leaf-500" : "bg-divider")}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function WizardStickyCTA({
  total,
  itemCount,
  label,
  onClick,
  disabled,
  hideSummary,
}: {
  total: number;
  itemCount: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hideSummary?: boolean;
}) {
  return (
    <div
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 rounded-sm border border-divider bg-paper-50/95 px-5 py-3 shadow-lg backdrop-blur md:hidden"
      role="region"
      aria-label="Ações da encomenda"
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
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-body-sm font-semibold text-paper-50 transition-colors focus-visible:outline-2 focus-visible:outline-olive-500",
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
