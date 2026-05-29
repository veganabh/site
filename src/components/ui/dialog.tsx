"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// ── Re-exports não estilizados ────────────────────────────────────────────────

/** Raiz do Dialog — controlado via `open` + `onOpenChange` ou não-controlado. */
export const Dialog = DialogPrimitive.Root;

/** Elemento que abre o Dialog ao ser clicado. */
export const DialogTrigger = DialogPrimitive.Trigger;

/** Elemento que fecha o Dialog ao ser clicado. Geralmente um botão "×". */
export const DialogClose = DialogPrimitive.Close;

// ── Tipos ──────────────────────────────────────────────────────────────────────

type DialogSize = "sm" | "md" | "lg";
type DialogVariant = "modal" | "drawer";

// ── Overlay ───────────────────────────────────────────────────────────────────

export type DialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;

/**
 * Overlay semitransparente sobre o fundo. Sempre usado dentro do Portal.
 * Inclui backdrop-blur para separação visual conforme DS §4.
 */
export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm", className)}
      {...props}
    />
  );
});
DialogOverlay.displayName = "DialogOverlay";

// ── Content ───────────────────────────────────────────────────────────────────

export type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /**
   * Tamanho máximo do modal.
   * - "sm" → max-w-sm (384px)
   * - "md" → max-w-lg (512px, default)
   * - "lg" → max-w-2xl (672px)
   * Ignorado quando variant="drawer".
   */
  size?: DialogSize;
  /**
   * Variante de apresentação.
   * - "modal" (default) — centralizado na tela, com translate.
   * - "drawer" — painel lateral direito, sem translate.
   */
  variant?: DialogVariant;
};

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

/**
 * Container principal do conteúdo do Dialog.
 * Gerencia focus trap, ESC e aria automaticamente via Radix.
 * Sempre renderizado dentro de `Dialog.Portal`.
 *
 * @example
 * // Modal padrão
 * <Dialog>
 *   <DialogTrigger asChild><Button>Abrir</Button></DialogTrigger>
 *   <DialogContent size="md">
 *     <DialogHeader>
 *       <DialogTitle>Novo cupom</DialogTitle>
 *       <DialogDescription>Preencha os campos abaixo.</DialogDescription>
 *     </DialogHeader>
 *     <DialogBody>...</DialogBody>
 *     <DialogFooter>...</DialogFooter>
 *   </DialogContent>
 * </Dialog>
 *
 * @example
 * // Drawer lateral
 * <DialogContent variant="drawer">...</DialogContent>
 */
export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ size = "md", variant = "modal", className, children, ...props }, ref) {
  const isDrawer = variant === "drawer";

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Base compartilhada
          "z-50 border border-divider bg-paper-50 shadow-lg focus:outline-none",
          // Modal — centralizado
          !isDrawer && [
            "fixed top-1/2 left-1/2 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-sm",
            sizeClasses[size],
          ],
          // Drawer — painel lateral direito
          isDrawer && "fixed inset-y-0 right-0 w-full max-w-md rounded-none",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";

// ── Subcomponentes de estrutura ───────────────────────────────────────────────

export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Cabeçalho do Dialog — separa título e descrição do corpo com linha divisória.
 */
export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("border-b border-divider px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export type DialogTitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;

/**
 * Título semântico do Dialog (mapeado para `aria-labelledby` pelo Radix).
 * Obrigatório para acessibilidade.
 */
export const DialogTitle = forwardRef<ElementRef<typeof DialogPrimitive.Title>, DialogTitleProps>(
  function DialogTitle({ className, ...props }, ref) {
    return (
      <DialogPrimitive.Title
        ref={ref}
        className={cn("text-h3 font-bold text-olive-900", className)}
        {...props}
      />
    );
  },
);
DialogTitle.displayName = "DialogTitle";

export type DialogDescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

/**
 * Descrição do Dialog (mapeado para `aria-describedby` pelo Radix).
 * Recomendado para acessibilidade — descreve o propósito do dialog.
 */
export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn("mt-0.5 text-body-sm text-olive-700", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Rodapé do Dialog — alinha ações à direita com linha divisória superior.
 * Tipicamente contém botões Cancelar + Confirmar.
 */
export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn("flex justify-end gap-3 border-t border-divider px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
