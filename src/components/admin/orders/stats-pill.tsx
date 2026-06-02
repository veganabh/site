"use client";

/**
 * StatsPill — pill densa de métrica usada nas strips acima dos kanbans
 * (pedidos do dia + encomendas do mês). DS v1.1.
 *
 * `emphasis="primary"` = KPI principal (valor em text-h4, bg olive discreto,
 * accent leaf na lateral). `default` = secundária. Clicável vira <button>.
 */

import { cn } from "@/lib/utils";

export type StatsPillProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger";
  emphasis?: "default" | "primary";
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
};

export function StatsPill({
  label,
  value,
  hint,
  tone = "default",
  emphasis = "default",
  icon,
  onClick,
  active,
  disabled,
}: StatsPillProps) {
  const clickable = !!onClick && !disabled;
  const isPrimary = emphasis === "primary";

  const toneBorder =
    tone === "danger"
      ? "border-terra-500/40"
      : tone === "warning"
        ? "border-warning/40"
        : isPrimary
          ? "border-olive-900/25"
          : "border-divider";

  const toneValue =
    tone === "danger" ? "text-terra-700" : tone === "warning" ? "text-olive-900" : "text-olive-900";

  return (
    <button
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      disabled={disabled}
      aria-pressed={clickable ? active : undefined}
      className={cn(
        "relative flex min-w-0 shrink-0 flex-col items-start gap-0 overflow-hidden rounded-sm border text-left transition",
        toneBorder,
        isPrimary ? "bg-olive-900/[0.04] px-4 py-2 shadow-sm" : "bg-paper-50 px-3 py-1.5",
        clickable &&
          "cursor-pointer hover:border-olive-900 focus:border-olive-900 focus:outline-none",
        active && "border-olive-900 bg-olive-900/5 shadow-sm",
        !clickable && "cursor-default",
      )}
    >
      {isPrimary && (
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-0 w-1 bg-leaf-500" />
      )}
      <span
        className={cn(
          "flex items-center gap-1 text-micro font-semibold tracking-wide uppercase",
          isPrimary ? "text-olive-900" : "text-olive-700",
        )}
      >
        {icon}
        {label}
      </span>
      <span
        className={cn("leading-tight font-bold", isPrimary ? "text-h4" : "text-caption", toneValue)}
      >
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "leading-tight",
            isPrimary ? "text-caption text-olive-700" : "text-micro text-olive-700",
          )}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
