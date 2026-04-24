"use client";

/**
 * Toggle (Switch) acessível — wrapper do Radix UI Switch.
 *
 * Tamanhos:
 *  - "md" (padrão): 44 × 24 px — uso geral
 *  - "lg": 56 × 32 px — destaque (ex: status da loja)
 *
 * A11y: role="switch" + aria-checked são gerenciados pelo Radix.
 * Sempre associe o Toggle a um <label> externo via htmlFor/id,
 * ou passe `aria-label` diretamente.
 */

import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type ToggleSize = "md" | "lg";

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const ROOT_CLASSES: Record<ToggleSize, string> = {
  md: "h-6 w-11",
  lg: "h-8 w-14",
};

const THUMB_CLASSES: Record<ToggleSize, string> = {
  md: "h-4 w-4 data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[3px]",
  lg: "h-6 w-6 data-[state=checked]:translate-x-[26px] data-[state=unchecked]:translate-x-[3px]",
};

export function Toggle({
  checked,
  onCheckedChange,
  disabled = false,
  size = "md",
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ToggleProps) {
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "transition-colors duration-150 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-900 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-olive-900 data-[state=unchecked]:bg-paper-100",
        ROOT_CLASSES[size],
      )}
    >
      <Switch.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-paper-50 shadow-sm",
          "transition-transform duration-150 ease-in-out",
          THUMB_CLASSES[size],
        )}
      />
    </Switch.Root>
  );
}
