"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Motivos pré-definidos ───────────────────────────────────────────────────

const PRESET_REASONS = [
  "Produto esgotado",
  "Cliente não atende",
  "Endereço fora da área",
  "Outro",
] as const;

type PresetReason = (typeof PRESET_REASONS)[number];

// ── Props ──────────────────────────────────────────────────────────────────

type CancelReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Chamado com o motivo final quando o admin confirma. */
  onConfirm: (reason: string) => void;
  /** Título personalizado para diferenciar "Recusar" de "Cancelar". */
  title?: string;
};

// ── Componente ─────────────────────────────────────────────────────────────

export function CancelReasonDialog({
  open,
  onClose,
  onConfirm,
  title = "Cancelar pedido",
}: CancelReasonDialogProps) {
  const [selected, setSelected] = useState<PresetReason | "">("");
  const [customText, setCustomText] = useState("");

  const finalReason = selected === "Outro" ? customText.trim() : selected;

  const canConfirm = selected !== "" && (selected !== "Outro" || customText.trim().length >= 3);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(finalReason);
    handleClose();
  }

  function handleClose() {
    setSelected("");
    setCustomText("");
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm" />

        {/* Dialog */}
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-divider bg-paper-50 p-6 shadow-lg",
            "focus:outline-none",
          )}
          aria-describedby="cancel-reason-description"
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-3">
            <Dialog.Title className="text-h3 font-bold text-olive-900">{title}</Dialog.Title>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-sm p-1 text-olive-700 transition hover:bg-paper-100 hover:text-olive-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-900"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <p id="cancel-reason-description" className="mb-4 text-body-sm text-olive-700">
            Selecione o motivo do cancelamento.
          </p>

          {/* Seleção de motivo */}
          <fieldset className="mb-4 flex flex-col gap-2">
            <legend className="sr-only">Motivo</legend>
            {PRESET_REASONS.map((reason) => (
              <label
                key={reason}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-body-sm transition",
                  selected === reason
                    ? "border-olive-900 bg-olive-900/5 text-olive-900"
                    : "border-divider bg-paper-50 text-olive-700 hover:border-sage-300",
                )}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={reason}
                  checked={selected === reason}
                  onChange={() => setSelected(reason)}
                  className="accent-olive-900"
                />
                {reason}
              </label>
            ))}
          </fieldset>

          {/* Texto livre quando "Outro" */}
          {selected === "Outro" && (
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Descreva o motivo..."
              maxLength={200}
              rows={3}
              className={cn(
                "mb-4 w-full resize-none rounded-md border border-divider bg-paper-50 px-3 py-2",
                "text-body-sm text-olive-900 placeholder:text-olive-700/50",
                "focus:border-olive-900 focus:outline-none",
              )}
            />
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-sm border border-divider bg-paper-50 py-2.5 text-cta text-olive-700 transition hover:bg-paper-100"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(
                "flex-1 rounded-sm py-2.5 text-cta font-semibold text-paper-50 transition",
                canConfirm ? "bg-error hover:opacity-90" : "cursor-not-allowed bg-error/40",
              )}
            >
              Confirmar cancelamento
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
