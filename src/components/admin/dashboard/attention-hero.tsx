"use client";

/**
 * attention-hero.tsx — Hero de atenção imediata do dashboard operacional.
 *
 * Lê o estado reativo da store de pedidos (client component) e exibe:
 * - Pedidos novos aguardando aceite
 * - Pedidos em preparo atrasado (> 30 min)
 * - Estoque crítico
 *
 * Quando nenhum alerta existe, exibe banner calmo de "tudo certo".
 *
 * Densidade alinhada com /gestao/pedidos (P0 dashboard polish):
 * cards compactos p-3, valor text-body, CTA compacto.
 */

import Link from "next/link";
import { ClipboardList, Clock, Package } from "lucide-react";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { useMenuStore } from "@/stores/menu-store";
import { countDelayedOrders } from "@/lib/dashboard-metrics";

export function AttentionHero() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const products = useMenuStore((s) => s.products);

  const newCount = orders.filter((o) => o.status === "NOVO").length;
  const delayedCount = countDelayedOrders(orders);
  const lowStockCount = products.filter(
    (p) => p.active && p.stock > 0 && p.stock <= p.lowStockThreshold,
  ).length;

  const hasAlerts = newCount > 0 || delayedCount > 0 || lowStockCount > 0;

  if (!hasAlerts) {
    return (
      <div
        role="status"
        aria-label="Situação operacional: tudo certo"
        className="rounded-lg border border-leaf-500/30 bg-leaf-500/8 p-4 text-body-sm text-leaf-700 shadow-sm"
      >
        <span className="font-semibold">Tudo certo por aqui.</span> Aproveita para revisar o
        cardápio ou preparar o cupom da semana.
      </div>
    );
  }

  return (
    <div
      aria-label="Alertas operacionais"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {/* Card: pedidos novos */}
      {newCount > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-terra-500/40 bg-terra-500/8 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0 text-terra-700" strokeWidth={1.75} />
            <span className="text-body-sm font-semibold text-terra-700">
              {newCount} {newCount === 1 ? "pedido novo" : "pedidos novos"}
            </span>
          </div>
          <p className="text-caption text-olive-700">
            {newCount === 1
              ? "Aguardando aceite — cliente esperando."
              : "Aguardando aceite — clientes esperando."}
          </p>
          <Link
            href="/gestao/pedidos"
            className="mt-auto block rounded-sm bg-terra-700 py-1.5 text-center text-caption font-semibold text-paper-50 transition hover:bg-terra-500"
          >
            Aceitar agora
          </Link>
        </div>
      )}

      {/* Card: preparo atrasado */}
      {delayedCount > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/8 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-body-sm font-semibold text-olive-900">
              {delayedCount} {delayedCount === 1 ? "pedido atrasado" : "pedidos atrasados"}
            </span>
          </div>
          <p className="text-caption text-olive-700">
            {delayedCount === 1
              ? "Em preparo há mais de 30 minutos."
              : "Em preparo há mais de 30 minutos cada."}
          </p>
          <Link
            href="/gestao/pedidos"
            className="mt-auto block rounded-sm bg-olive-900 py-1.5 text-center text-caption font-semibold text-paper-50 transition hover:bg-olive-700"
          >
            Ver kanban
          </Link>
        </div>
      )}

      {/* Card: estoque crítico */}
      {lowStockCount > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-terra-700/40 bg-terra-700/8 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-terra-700" strokeWidth={1.75} />
            <span className="text-body-sm font-semibold text-terra-700">
              {lowStockCount}{" "}
              {lowStockCount === 1 ? "produto com estoque baixo" : "produtos com estoque baixo"}
            </span>
          </div>
          <p className="text-caption text-olive-700">
            Pouco estoque — vale checar antes de aceitar mais pedidos.
          </p>
          <Link
            href="/gestao/cardapio"
            className="mt-auto block rounded-sm bg-olive-900 py-1.5 text-center text-caption font-semibold text-paper-50 transition hover:bg-olive-700"
          >
            Ver cardápio
          </Link>
        </div>
      )}
    </div>
  );
}
