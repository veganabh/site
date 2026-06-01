"use client";

import { useState } from "react";
import { ProductCardPhoto } from "@/components/dashboard/product-card-photo";
import { ContextConflictDialog } from "@/components/dashboard/context-conflict-dialog";
import { cn } from "@/lib/utils";
import { sortSoldOutLast } from "@/lib/product-sort";
import { useCartStore, type OrderContext } from "@/stores/cart-store";
import type { Product } from "@/types/product";

type ProductGridPhotoProps = {
  products: Product[];
  className?: string;
  emptyMessage?: string;
  /**
   * Contexto de origem do grid: 'daily' (default) ou 'preorder'.
   * Propagado para cada card — define comportamento de estoque e carrinho.
   */
  orderContext?: OrderContext;
  /**
   * @deprecated Use orderContext='preorder'
   * Mantido para compat com chamadas existentes durante migração.
   */
  preorderMode?: boolean;
};

export function ProductGridPhoto({
  products,
  className,
  emptyMessage = "Nada por aqui ainda — tente outra categoria.",
  orderContext,
  preorderMode = false,
}: ProductGridPhotoProps) {
  // Compat: preorderMode antigo mapeia para orderContext='preorder'
  const effectiveContext: OrderContext = orderContext ?? (preorderMode ? "preorder" : "daily");

  const resolveContextConflict = useCartStore((s) => s.resolveContextConflict);

  // Estado do dialog de conflito de contexto
  const [conflictProduct, setConflictProduct] = useState<Product | null>(null);
  const [conflictTargetContext, setConflictTargetContext] = useState<OrderContext>("daily");

  function handleContextConflict(product: Product, targetContext: OrderContext) {
    setConflictProduct(product);
    setConflictTargetContext(targetContext);
  }

  function handleConflictConfirm() {
    if (!conflictProduct) return;
    resolveContextConflict(conflictProduct, conflictTargetContext);
    setConflictProduct(null);
  }

  function handleConflictCancel() {
    setConflictProduct(null);
  }

  if (products.length === 0) {
    return (
      <p className={cn("px-4 py-10 text-center text-body-sm text-olive-700", className)}>
        {emptyMessage}
      </p>
    );
  }

  // Em preorder, não reordena por estoque — todos são disponíveis pra encomenda.
  const ordered = effectiveContext === "preorder" ? products : sortSoldOutLast(products);

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
          className,
        )}
      >
        {ordered.map((p) => (
          <ProductCardPhoto
            key={p.id}
            product={p}
            orderContext={effectiveContext}
            onContextConflict={handleContextConflict}
          />
        ))}
      </div>

      {conflictProduct && (
        <ContextConflictDialog
          incomingContext={conflictTargetContext}
          onConfirm={handleConflictConfirm}
          onCancel={handleConflictCancel}
        />
      )}
    </>
  );
}
