"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatBRL } from "@/lib/format";

/**
 * Barra sticky mobile sobre o BottomNav — aparece quando há itens no carrinho.
 * Padrão iFood/Goomer/Rappi: visibilidade permanente do total + atalho /carrinho.
 * Desktop esconde (md:hidden) — painel direito já mostra pedido.
 * Esconde em /carrinho (já é o destino) e em /gestao/* (contexto admin).
 */
export function MiniCartBar() {
  const items = useCartStore((s) => s.items);
  const pathname = usePathname() ?? "/";

  const hideRoute = pathname.startsWith("/carrinho") || pathname.startsWith("/gestao");
  if (hideRoute || items.length === 0) return null;

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = items.reduce((acc, i) => acc + i.product.price_site * i.quantity, 0);

  return (
    <Link
      href="/carrinho"
      aria-label={`Ver carrinho com ${itemCount} ${itemCount === 1 ? "item" : "itens"}, total ${formatBRL(subtotal)}`}
      className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+3rem)] z-20 flex items-center justify-between gap-3 rounded-full bg-terra-500 px-5 pt-2.5 pb-6 text-paper-50 shadow-md transition-transform active:scale-[0.98] md:hidden"
    >
      <span className="flex items-center gap-2">
        <span className="relative inline-flex">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
          <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-500 px-1 text-[10px] font-bold text-paper-50">
            {itemCount}
          </span>
        </span>
        <span className="text-[13px] font-semibold">Ver carrinho</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-[14px] font-bold tabular-nums">{formatBRL(subtotal)}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
