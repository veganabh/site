"use client";

import { useState } from "react";
import { Plus, Star, Truck } from "lucide-react";
import { ProductPhoto } from "@/components/features/product-photo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { CATEGORY_LABEL } from "@/lib/product-meta";
import { useCartStore } from "@/stores/cart-store";
import { useDeliveryStore } from "@/stores/delivery-store";
import type { Product } from "@/types/product";

type ProductCardPhotoProps = {
  product: Product;
  className?: string;
};

export function ProductCardPhoto({ product, className }: ProductCardPhotoProps) {
  const addItem = useCartStore((s) => s.addItem);
  const deliveryQuote = useDeliveryStore((s) => s.quote);
  const savings = product.price_ifood - product.price_site;
  const hasSavings = savings > 0;

  const [popping, setPopping] = useState(false);
  const handleAdd = () => {
    if (product.stock === 0) return;
    addItem(product);
    setPopping(true);
    setTimeout(() => setPopping(false), 380);
  };

  const isSoldOut = product.stock === 0;
  const isLowStock = !isSoldOut && product.stock <= product.lowStockThreshold;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-divider bg-paper-50 transition-shadow md:hover:shadow-md",
        className,
      )}
    >
      <div className="relative block aspect-[4/3] overflow-hidden bg-paper-100">
        <ProductPhoto
          product={product}
          withHoverSecondary
          className="transition-transform duration-500 md:group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Social proof — top-left */}
        {product.ifoodRating !== undefined && (
          <div
            className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-pill bg-paper-50/95 px-2 py-0.5 text-[10px] font-semibold text-olive-900 shadow-sm backdrop-blur-sm"
            aria-label={`Avaliação ${product.ifoodRating} de 5 no iFood${
              product.ifoodOrderCount ? `, ${product.ifoodOrderCount} pedidos` : ""
            }`}
          >
            <Star className="h-2.5 w-2.5 fill-terra-500 text-terra-500" aria-hidden="true" />
            <span>{product.ifoodRating.toFixed(1)}</span>
            {product.ifoodOrderCount !== undefined && (
              <>
                <span className="text-olive-500">·</span>
                <span className="text-olive-700">{product.ifoodOrderCount}+</span>
              </>
            )}
          </div>
        )}

        {/* Scarcity / sold-out — bottom-left */}
        {(isSoldOut || isLowStock) && (
          <div
            className={cn(
              "absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold shadow-sm",
              isSoldOut
                ? "bg-olive-900/85 text-paper-50"
                : "bg-terra-500/95 text-paper-50",
            )}
            aria-label={isSoldOut ? "Esgotado" : `Restam ${product.stock}`}
          >
            {isSoldOut ? "Esgotado" : `Restam ${product.stock}`}
          </div>
        )}

        {/* Quick-add — top-right with pop animation */}
        <button
          type="button"
          aria-label={`Adicionar ${product.name} ao carrinho`}
          onClick={handleAdd}
          disabled={isSoldOut}
          className={cn(
            "absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-paper-50 shadow-md transition-transform duration-200 active:scale-95",
            isSoldOut
              ? "cursor-not-allowed bg-olive-500/60"
              : "bg-leaf-500 hover:bg-terra-500",
            popping && !isSoldOut
              ? "scale-125 rotate-12"
              : !isSoldOut && "hover:scale-105",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-sans text-[13px] leading-snug font-semibold text-olive-900">
          {product.name}
        </h3>
        <p className="text-[11px] text-olive-700">
          {CATEGORY_LABEL[product.category]} · {product.gramatura_g}g
          {product.serves !== undefined && ` · serve ${product.serves}`}
        </p>

        {/* ETA quando CEP consultado e área coberta */}
        {deliveryQuote?.covered && !isSoldOut && (
          <p className="inline-flex items-center gap-1 text-[10px] text-leaf-700">
            <Truck className="h-2.5 w-2.5" aria-hidden="true" />
            ~{deliveryQuote.eta}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex flex-col leading-tight">
            <span className="text-body font-bold text-olive-900">
              {formatBRL(product.price_site)}
            </span>
            {hasSavings && (
              <span className="text-[10px] text-olive-700 line-through">
                iFood {formatBRL(product.price_ifood)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

