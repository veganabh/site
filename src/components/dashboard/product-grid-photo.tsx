import { ProductCardPhoto } from "@/components/dashboard/product-card-photo";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductGridPhotoProps = {
  products: Product[];
  className?: string;
  emptyMessage?: string;
};

export function ProductGridPhoto({
  products,
  className,
  emptyMessage = "Nada por aqui ainda — tente outra categoria.",
}: ProductGridPhotoProps) {
  if (products.length === 0) {
    return (
      <p className={cn("px-4 py-10 text-center text-body-sm text-olive-700", className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((p) => (
        <ProductCardPhoto key={p.id} product={p} />
      ))}
    </div>
  );
}
