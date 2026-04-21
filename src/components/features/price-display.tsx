import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

type PriceDisplayProps = {
  priceSite: number;
  priceIfood: number;
  /** Se true e há economia, renderiza linha "você economiza R$ X,XX". */
  showSavingsLabel?: boolean;
  className?: string;
};

/**
 * Bolha de preço comparada — DS §9.3.
 * Só mostra o riscado do iFood quando `priceIfood > priceSite`.
 */
export function PriceDisplay({
  priceSite,
  priceIfood,
  showSavingsLabel = false,
  className,
}: PriceDisplayProps) {
  const savings = priceIfood - priceSite;
  const hasSavings = savings > 0;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-price font-bold text-olive-900">{formatBRL(priceSite)}</span>
        {hasSavings && (
          <span className="text-body-sm text-olive-700 line-through">
            no iFood: {formatBRL(priceIfood)}
          </span>
        )}
      </div>
      {hasSavings && showSavingsLabel && (
        <p className="text-caption font-bold text-terra-700">você economiza {formatBRL(savings)}</p>
      )}
    </div>
  );
}
