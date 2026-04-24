"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { AdminKitTemplate } from "@/stores/admin-kits-store";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type KitDeleteDialogProps = {
  /** Kit a ser excluído. null = dialog fechado. */
  kit: AdminKitTemplate | null;
  onConfirm: () => void;
  onCancel: () => void;
};

// ── Componente ─────────────────────────────────────────────────────────────────

export function KitDeleteDialog({ kit, onConfirm, onCancel }: KitDeleteDialogProps) {
  return (
    <Dialog.Root
      open={!!kit}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm" />

        {/* Painel */}
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-paper-50 p-6 shadow-lg focus:outline-none"
          aria-describedby="kit-delete-description"
        >
          {/* Título */}
          <Dialog.Title className="text-h3 font-bold text-olive-900">Excluir kit?</Dialog.Title>

          {/* Descrição visível */}
          <Dialog.Description
            id="kit-delete-description"
            className="mt-2 text-body-sm text-olive-700"
          >
            O kit{" "}
            <strong className="font-semibold text-olive-900">&ldquo;{kit?.name}&rdquo;</strong>{" "}
            será removido. Clientes que já compraram mantêm o pedido.
          </Dialog.Description>

          {/* Ações */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center rounded-md border border-divider bg-paper-50 px-4 text-body-sm font-semibold text-olive-900 transition hover:bg-paper-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex h-9 items-center rounded-md bg-terra-700 px-4 text-body-sm font-semibold text-paper-50 transition hover:bg-error"
            >
              Excluir
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
