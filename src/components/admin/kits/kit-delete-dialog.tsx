"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GiftKitTemplate } from "@/types/gift-kit";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type KitDeleteDialogProps = {
  /** Kit a ser excluído. null = dialog fechado. */
  kit: GiftKitTemplate | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// ── Componente ─────────────────────────────────────────────────────────────────

export function KitDeleteDialog({ kit, onConfirm, onCancel }: KitDeleteDialogProps) {
  return (
    <Dialog
      open={!!kit}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent size="sm" aria-describedby="kit-delete-description">
        {/* Título */}
        <div className="px-6 pt-6">
          <DialogTitle>Excluir kit?</DialogTitle>

          {/* Descrição visível */}
          <DialogDescription id="kit-delete-description" className="mt-2">
            O kit{" "}
            <strong className="font-semibold text-olive-900">&ldquo;{kit?.name}&rdquo;</strong> será
            removido. Clientes que já compraram mantêm o pedido.
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
