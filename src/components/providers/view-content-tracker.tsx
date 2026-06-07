"use client";

import { useEffect } from "react";

import { captureEvent } from "@/lib/analytics";

type Props = {
  /** ID do conteúdo visto (produto/kit) — vira content_ids no Pixel. */
  productId: string;
  /** Nome do conteúdo — content_name. */
  name: string;
  /** Preço em reais — value (BRL). */
  price: number;
};

/**
 * Dispara `view_content` (→ ViewContent no Meta Pixel) uma vez ao montar.
 * Usado em páginas de detalhe de produto/kit (server components) que não podem
 * chamar analytics diretamente. Sinal de retargeting: viu mas não comprou.
 */
export function ViewContentTracker({ productId, name, price }: Props) {
  useEffect(() => {
    captureEvent("view_content", { productId, name, price });
    // dispara só na montagem / troca de produto
  }, [productId, name, price]);

  return null;
}
