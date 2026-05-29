import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Estilo visual do botão. Default: "primary". */
  variant?: ButtonVariant;
  /** Tamanho do botão. Default: "md" (h-11, 44px — atinge alvo mínimo WCAG 2.5.5). */
  size?: ButtonSize;
  /**
   * Exibe spinner Loader2 e desabilita o botão enquanto uma ação assíncrona
   * está em andamento. Mantém largura estável via `inline-flex`.
   */
  isLoading?: boolean;
  /**
   * Quando true, renderiza o filho como elemento raiz em vez de `<button>`.
   * Útil para compor com `<Link>` do Next.js sem aninhamento de elementos.
   *
   * @example
   * <Button asChild variant="primary">
   *   <Link href="/cardapio">Ver cardápio</Link>
   * </Button>
   */
  asChild?: boolean;
};

// ── Variantes ─────────────────────────────────────────────────────────────────

/**
 * Classes de bg/border por variante — separadas das classes de texto/cor
 * para evitar conflitos no tailwind-merge com tokens customizados do DS.
 */
const variantBgClasses: Record<ButtonVariant, string> = {
  primary: "bg-olive-900 hover:bg-olive-700 focus-visible:ring-olive-900/30",
  secondary: "border border-divider bg-paper-100 hover:bg-paper-50 focus-visible:ring-olive-900/30",
  ghost: "hover:bg-paper-100 focus-visible:ring-olive-900/30",
  danger: "bg-error hover:bg-terra-700 focus-visible:ring-error/30",
};

/**
 * Cor de texto por variante — declarada em classe isolada para que o
 * tailwind-merge não a confunda com classes de tamanho de texto (`text-cta`).
 */
const variantTextClasses: Record<ButtonVariant, string> = {
  primary: "text-paper-50",
  secondary: "text-olive-900",
  ghost: "text-olive-900",
  danger: "text-paper-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-body-sm",
  md: "h-11 px-6 text-cta",
  lg: "h-12 px-8 text-cta",
};

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Botão primitivo do DS Veg.ana — §6 `ui/button`.
 *
 * Server-safe: sem hooks, sem browser APIs. Pode ser importado em Server Components.
 * Quando precisar de interatividade no pai, basta que o pai seja Client Component.
 *
 * Nota: quando `asChild=true`, o spinner `isLoading` não é renderizado para
 * manter compatibilidade com o Radix Slot (exige 1 filho React exato).
 * Botões com loading state geralmente não são usados com `asChild`.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    asChild = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const sharedClassName = cn(
    // Base
    "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition",
    "outline-none focus-visible:ring-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
    // Cor de texto isolada (evita conflito tw-merge com text-cta/text-body-sm)
    variantTextClasses[variant],
    // Bg/border da variante
    variantBgClasses[variant],
    // Tamanho (inclui text-size)
    sizeClasses[size],
    className,
  );

  // Quando asChild, o Radix Slot requer exatamente 1 filho React (React.Children.only).
  // Renderizamos o children sozinho para satisfazer essa invariante.
  // isLoading não faz sentido semanticamente com asChild (que é para <Link>).
  if (asChild) {
    return (
      <Slot ref={ref} className={sharedClassName} {...rest}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={sharedClassName}
      {...rest}
    >
      {isLoading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";
