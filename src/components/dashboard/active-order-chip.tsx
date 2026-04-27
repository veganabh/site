"use client";

import { useMemo } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { isTerminal, type OrderStatus } from "@/types/order";

/**
 * Chip persistente da Topbar que mostra o status do pedido ativo do cliente
 * logado. Fonte: `useAdminOrdersStore` (hidratado server-side via root layout).
 *
 * Some quando:
 * - cliente não autenticado
 * - cliente sem pedido em status não-terminal (ENTREGUE/CANCELADO removem)
 *
 * Mostra o pedido mais recente. Se houver mais de um ativo, exibe `+N`.
 *
 * Click → `/pedido/[id]` (rota ainda não existe — fallback para `/conta`).
 *
 * Atualização real-time é P1 — por hora, depende de `revalidatePath` no
 * server action que avança o status. BroadcastChannel já mantém abas em sync
 * dentro do mesmo browser quando admin avança o kanban.
 */

type StatusCopy = {
  label: string;
  toneClass: string;
  dotClass: string;
  pulse: boolean;
};

const STATUS_BY_ID: Record<OrderStatus, StatusCopy | null> = {
  NOVO: {
    label: "Denise tá vendo seu pedido",
    toneClass: "bg-terra-500/10 text-terra-700 hover:bg-terra-500/15",
    dotClass: "bg-terra-500",
    pulse: false,
  },
  PREPARANDO: {
    label: "No forno",
    toneClass: "bg-terra-700/15 text-terra-700 hover:bg-terra-700/20",
    dotClass: "bg-terra-700",
    pulse: true,
  },
  PRONTO: {
    label: "Saindo do forno",
    toneClass: "bg-leaf-500/15 text-leaf-700 hover:bg-leaf-500/25",
    dotClass: "bg-leaf-700",
    pulse: false,
  },
  A_CAMINHO: {
    label: "Tá indo aí",
    toneClass: "bg-leaf-500/15 text-leaf-700 hover:bg-leaf-500/25",
    dotClass: "bg-leaf-500",
    pulse: true,
  },
  ENTREGUE: null,
  CANCELADO: null,
};

export function ActiveOrderChip() {
  const { isAuthed, user } = useSession();
  const orders = useAdminOrdersStore((s) => s.orders);

  const activeOrders = useMemo(() => {
    if (!user?.id) return [];
    return orders.filter((o) => o.customerId === user.id && !isTerminal(o.status));
  }, [orders, user?.id]);

  if (!isAuthed) return null;
  if (activeOrders.length === 0) return null;

  const latest = activeOrders[0];
  const copy = STATUS_BY_ID[latest.status];
  if (!copy) return null;

  const extras = activeOrders.length - 1;

  return (
    <Link
      href={`/pedido/${latest.id}`}
      aria-label={`Pedido em andamento: ${copy.label}`}
      className={cn(
        "hidden items-center gap-2 rounded-pill px-3 py-1.5 text-[12px] font-semibold transition-colors md:inline-flex",
        copy.toneClass,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", copy.dotClass, copy.pulse && "animate-pulse")}
      />
      <span>{copy.label}</span>
      {extras > 0 && (
        <span className="ml-0.5 rounded-pill bg-paper-50/70 px-1.5 text-[10.5px] font-bold text-olive-900">
          +{extras}
        </span>
      )}
    </Link>
  );
}
