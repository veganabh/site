"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Coupon } from "@/types/coupon";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type CouponDeleteDialogProps = {
  /** Cupom a ser excluído. null = dialog fechado. */
  coupon: Coupon | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// ── Componente ─────────────────────────────────────────────────────────────────

export function CouponDeleteDialog({ coupon, onConfirm, onCancel }: CouponDeleteDialogProps) {
  return (
    <Dialog
      open={!!coupon}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent size="sm" aria-describedby="delete-description">
        {/* Título */}
        <div className="px-6 pt-6">
          <DialogTitle>Excluir cupom?</DialogTitle>

          {/* Descrição visível */}
          <DialogDescription id="delete-description" className="mt-2">
            O cupom <strong className="font-semibold text-olive-900">{coupon?.code}</strong> será
            removido. Clientes que já usaram mantêm o benefício.
          </DialogDescription>
        </div>

        {/* Ações */}
        <DialogFooter className="mt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onConfirm}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
