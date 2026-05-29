import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Quando true, aplica borda de erro e ring de foco vermelho.
   * Usar em conjunto com mensagem de erro acessível (`aria-describedby`).
   */
  hasError?: boolean;
};

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Quando true, aplica borda de erro e ring de foco vermelho. */
  hasError?: boolean;
};

// ── Classes base compartilhadas ────────────────────────────────────────────────

/**
 * Classes base do input/textarea do DS Veg.ana.
 * Unifica `inputClass()` de `produto-form.tsx` e `coupon-form-dialog.tsx`.
 */
function inputBase(hasError: boolean, extra?: string) {
  return cn(
    "w-full rounded-sm border bg-paper-50 px-3 text-body-sm text-olive-900 outline-none transition",
    "placeholder:text-olive-500",
    "focus:ring-2",
    hasError ? "border-error focus:ring-error/30" : "border-divider focus:ring-olive-900/20",
    "disabled:cursor-not-allowed disabled:opacity-60",
    extra,
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

/**
 * Input primitivo do DS Veg.ana — §6 `ui/input`.
 *
 * Compatível com React Hook Form via `register()` (spread de props + ref).
 * Server-safe: sem hooks. Usar `forwardRef` para RHF e refs imperativos.
 *
 * @example
 * // Com react-hook-form
 * <Input {...register("name")} hasError={!!errors.name} />
 *
 * @example
 * // Campo de data
 * <Input type="date" hasError={!!errors.validFrom} />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(inputBase(hasError, "h-11"), className)} {...rest} />;
});

Input.displayName = "Input";

// ── TextArea ──────────────────────────────────────────────────────────────────

/**
 * TextArea primitivo do DS Veg.ana — mesma base visual do `Input`,
 * sem altura fixa (usa `min-h-*` + `py-2` para conforto vertical).
 *
 * @example
 * <TextArea
 *   {...register("description")}
 *   rows={3}
 *   hasError={!!errors.description}
 *   className="resize-y"
 * />
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { hasError = false, className, ...rest },
  ref,
) {
  return (
    <textarea ref={ref} className={cn(inputBase(hasError, "min-h-24 py-2"), className)} {...rest} />
  );
});

TextArea.displayName = "TextArea";
