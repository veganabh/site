"use client";

/**
 * recent-orders-feed.tsx — Feed dos 5 pedidos mais recentes.
 *
 * Client Component: lê pedidos reativos da store Zustand para refletir
 * mudanças de status em tempo real sem recarregar a página.
 *
 * Navega para /gestao/pedidos?open=<id> ao clicar — a página de pedidos
 * pode ler o querystring para abrir o drawer do pedido correspondente.
 */

import Link from "next/link";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { OrderStatusBadge } from "@/components/features/order-status-badge";
import { getRecentOrders, formatRelativeTime } from "@/lib/dashboard-metrics";

export function RecentOrdersFeed() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const recent = getRecentOrders(orders, 5);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-divider bg-paper-50 p-4 shadow-sm">
      <h2 className="text-body-sm font-bold text-olive-900">Pedidos recentes</h2>

      {recent.length === 0 ? (
        <p className="text-caption text-olive-700">Nenhum pedido ainda hoje.</p>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {recent.map((order) => {
            const total = order.total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            });
            const shortId = String(order.orderNumber);
            const relativeTime = formatRelativeTime(order.createdAt);

            return (
              <li key={order.id}>
                <Link
                  href={`/gestao/pedidos?open=${order.id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-paper-100"
                  aria-label={`Pedido ${shortId} — ${order.customerName} — ${total}`}
                >
                  {/* ID + cliente */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-olive-700">#{shortId}</span>
                      <span className="truncate text-caption font-semibold text-olive-900">
                        {order.customerName}
                      </span>
                    </div>
                    <span className="text-[10px] text-olive-700">{relativeTime}</span>
                  </div>

                  {/* Status + valor */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[10px] font-bold text-olive-900">{total}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <Link
        href="/gestao/pedidos"
        className="text-center text-caption font-semibold text-olive-700 underline-offset-2 hover:underline"
      >
        Ver todos os pedidos
      </Link>
    </div>
  );
}
