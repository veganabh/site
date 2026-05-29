import { type HTMLAttributes, type ElementType } from "react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = HTMLAttributes<HTMLElement> & {
  /**
   * Elemento semântico a renderizar. Escolha com base no contexto:
   * - `div` (default) — container genérico, dentro de listas ou dashboards
   * - `article` — item de cardápio, post, produto (conteúdo auto-contido)
   * - `section` — bloco de conteúdo com heading próprio
   */
  as?: "div" | "article" | "section";
  /**
   * Padding interno do card. Default: "md" (p-5).
   * Use "none" para foto sangrada + `className="overflow-hidden"`.
   */
  padding?: CardPadding;
  /**
   * Ativa hover de elevação em viewport ≥ md.
   * Usar em cards clicáveis/interativos (produto, coleção, kit).
   */
  interactive?: boolean;
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

// ── Card ──────────────────────────────────────────────────────────────────────

/**
 * Card primitivo do DS Veg.ana — §6 `ui/card`.
 *
 * Server-safe: sem hooks, sem browser APIs.
 *
 * @example
 * // Card de produto com foto sangrada
 * <Card as="article" padding="none" interactive className="overflow-hidden">
 *   <Image ... />
 *   <CardBody>...</CardBody>
 * </Card>
 *
 * @example
 * // Card de formulário com header e footer
 * <Card>
 *   <CardHeader>Novo pedido</CardHeader>
 *   <CardBody>...</CardBody>
 *   <CardFooter>...</CardFooter>
 * </Card>
 */
export function Card({
  as,
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={cn(
        "rounded-sm border border-divider bg-paper-50 shadow-sm",
        paddingClasses[padding],
        interactive && "transition-shadow md:hover:shadow-md",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Cabeçalho do Card — linha divisória inferior, padding horizontal padrão.
 * Tipicamente contém título (`text-h3 font-bold`) e ações secundárias.
 */
export function CardHeader({ className, children, ...rest }: CardHeaderProps) {
  return (
    <div className={cn("border-b border-divider px-5 py-3", className)} {...rest}>
      {children}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

/**
 * Corpo do Card — área de conteúdo principal com padding padrão.
 * Quando o Card usa `padding="none"`, usar CardBody para o conteúdo interno.
 */
export function CardBody({ className, children, ...rest }: CardBodyProps) {
  return (
    <div className={cn("p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Rodapé do Card — linha divisória superior, alinha ações à direita.
 * Tipicamente contém botões de ação (cancelar + confirmar).
 */
export function CardFooter({ className, children, ...rest }: CardFooterProps) {
  return (
    <div
      className={cn("flex justify-end gap-3 border-t border-divider px-5 py-3", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
