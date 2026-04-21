import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "soft" | "strong";
};

/**
 * Pílula reutilizável — atributos de produto, filtros, chips de categoria.
 * Conforme DS §9.4.
 */
export function Badge({ variant = "soft", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-caption font-bold",
        variant === "soft" && "bg-paper-100 text-olive-900",
        variant === "strong" && "bg-olive-500 text-paper-50",
        className,
      )}
      {...rest}
    />
  );
}
