import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/features/price-display";
import { ATTRIBUTE_LABEL } from "@/lib/product-meta";
import type { Product } from "@/types/product";

type ProductCardProps = {
  product: Product;
  /** Quando ausente, o botão fica desabilitado. Ligado no ADR 0003. */
  onAdd?: (product: Product) => void;
  className?: string;
};

/**
 * Card de produto — DS §9.2.
 * Foto + badges + nome + descrição + gramatura + preço comparado + CTA.
 */
export function ProductCard({ product, onAdd, className }: ProductCardProps) {
  const addDisabled = !onAdd;
  const visibleAttrs = product.attributes.slice(0, 2);

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-md border border-divider bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-paper-100">
        <Image
          src={product.photo.url}
          alt={product.photo.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      {visibleAttrs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleAttrs.map((attr) => (
            <Badge key={attr}>{ATTRIBUTE_LABEL[attr]}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h3 className="text-h3 font-semibold text-olive-900">{product.name}</h3>
        <p className="line-clamp-2 text-body-sm text-olive-700">{product.description}</p>
        {product.gramatura_g > 0 && (
          <p className="text-caption text-olive-700">{product.gramatura_g}g</p>
        )}
      </div>

      <PriceDisplay priceSite={product.price_site} priceIfood={product.price_ifood} />

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={onAdd ? () => onAdd(product) : undefined}
          disabled={addDisabled}
          aria-disabled={addDisabled}
          className={cn(
            "rounded-sm bg-olive-900 px-6 py-3 text-cta font-semibold text-paper-50 transition-colors",
            "hover:bg-olive-700",
            "disabled:cursor-not-allowed disabled:bg-sage-300 disabled:text-olive-900",
          )}
        >
          Adicionar
        </button>
        {addDisabled && <p className="text-caption text-olive-700">Carrinho em breve.</p>}
      </div>
    </article>
  );
}
