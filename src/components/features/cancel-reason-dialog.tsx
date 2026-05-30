"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/input";

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
  /** Mostra aviso de estorno manual (pedido já estava pago). */
  refundNotice?: boolean;
};

// ── Componente ─────────────────────────────────────────────────────────────

export function CancelReasonDialog({
  open,
  onClose,
  onConfirm,
  title = "Cancelar pedido",
  refundNotice = false,
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
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent size="sm" aria-describedby="cancel-reason-description">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose
            aria-label="Fechar"
            className="rounded-sm p-1 text-olive-700 transition hover:bg-paper-100 hover:text-olive-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-900"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </DialogClose>
        </div>

        <div className="px-6 pb-6">
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
                  "flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-body-sm transition",
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
            <TextArea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Descreva o motivo..."
              maxLength={200}
              rows={3}
              className="mb-4 resize-none"
            />
          )}

          {/* Aviso de estorno — pedido já estava pago */}
          {refundNotice && (
            <p className="mb-4 rounded-sm border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-olive-700">
              Esse pedido já foi pago. Ao confirmar, marcamos como{" "}
              <span className="font-semibold">estornado</span> — faça a devolução do valor no painel
              do AbacatePay.
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1"
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
