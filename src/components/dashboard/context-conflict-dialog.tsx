"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import type { OrderContext } from "@/stores/cart-store";

type ContextConflictDialogProps = {
  /** Contexto do item que está tentando entrar no carrinho */
  incomingContext: OrderContext;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Dialog de aviso ao tentar misturar itens de contextos diferentes
 * (diário vs. encomenda) no mesmo carrinho.
 *
 * Segue Brand Voice: afetivo, concreto, sem infantil.
 */
export function ContextConflictDialog({
  incomingContext,
  onConfirm,
  onCancel,
}: ContextConflictDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const isIncomingPreorder = incomingContext === "preorder";

  const title = isIncomingPreorder
    ? "Sua cesta tem itens do dia a dia"
    : "Sua cesta tem uma encomenda";

  const description = isIncomingPreorder
    ? "Itens do cardápio e encomendas seguem fluxos diferentes. Quer começar uma encomenda nova? Os itens atuais saem da cesta."
    : "Você tem uma encomenda na cesta. Quer substituir pelo pedido do dia? Os itens da encomenda saem.";

  const confirmLabel = isIncomingPreorder ? "Sim, iniciar encomenda" : "Sim, pedido do dia";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ctx-conflict-title"
      aria-describedby="ctx-conflict-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 px-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-sm bg-paper-50 p-6 shadow-lg">
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-terra-500" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            <h2 id="ctx-conflict-title" className="text-body font-semibold text-olive-900">
              {title}
            </h2>
            <p id="ctx-conflict-desc" className="text-body-sm text-olive-700">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center rounded-full border border-divider px-4 text-body-sm font-semibold text-olive-700 transition-colors hover:bg-paper-100 focus-visible:outline-2 focus-visible:outline-olive-500"
          >
            Manter cesta atual
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-9 items-center justify-center rounded-full bg-terra-700 px-4 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-terra-500 focus-visible:outline-2 focus-visible:outline-terra-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
