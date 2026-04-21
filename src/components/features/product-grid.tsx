import type { Product } from "@/types/product";
import { ProductCard } from "@/components/features/product-card";
import { cn } from "@/lib/utils";

type ProductGridProps = {
  products: Product[];
  className?: string;
  emptyMessage?: string;
};

/**
 * Grid responsivo de ProductCard. Mostra mensagem de vazio quando
 * não há produtos (ex: categoria sem itens).
 */
export function ProductGrid({
  products,
  className,
  emptyMessage = "Nada por aqui agora. Volta daqui a pouco.",
}: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-body text-olive-700">{emptyMessage}</p>;
  }
  return (
    <section
      aria-label="Lista de produtos"
      className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </section>
  );
}
