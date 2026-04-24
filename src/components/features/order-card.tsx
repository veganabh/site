"use client";

import { useEffect, useState, useCallback } from "react";
import type { Order, OrderStatus } from "@/types/order";
import { canTransitionTo } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Minutos decorridos desde `isoString`. */
function minutesSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000);
}

// ── Status badge visual ────────────────────────────────────────────────────
// Badge + CTA compartilham a mesma cor de família por status — vínculo visual
// imediato entre o estado atual do card e a ação primária.

const STATUS_BADGE: Record<OrderStatus, { label: string; badgeClass: string; ctaClass: string }> = {
  NOVO: {
    label: "Novo",
    badgeClass: "bg-terra-500/10 text-terra-700 border border-terra-500/20",
    ctaClass: "bg-terra-500 text-paper-50 hover:bg-terra-700",
  },
  PREPARANDO: {
    label: "Preparando",
    badgeClass: "bg-warning/15 text-olive-900 border border-warning/30",
    ctaClass: "bg-warning text-olive-900 hover:bg-warning/90",
  },
  PRONTO: {
    label: "Pronto",
    badgeClass: "bg-leaf-500/10 text-leaf-700 border border-leaf-500/20",
    ctaClass: "bg-leaf-500 text-paper-50 hover:bg-leaf-700",
  },
  A_CAMINHO: {
    label: "A caminho",
    badgeClass: "bg-info/10 text-info border border-info/20",
    ctaClass: "bg-info text-paper-50 hover:opacity-90",
  },
  ENTREGUE: {
    label: "Entregue",
    badgeClass: "bg-success/10 text-success border border-success/20",
    ctaClass: "bg-success text-paper-50 hover:opacity-90",
  },
  CANCELADO: {
    label: "Cancelado",
    badgeClass: "bg-error/10 text-error border border-error/20",
    ctaClass: "bg-error text-paper-50 hover:opacity-90",
  },
};

// ── Props ──────────────────────────────────────────────────────────────────

type OrderCardProps = {
  order: Order;
  /** Abre o drawer de detalhe do pedido */
  onOpen: (orderId: string) => void;
  className?: string;
};

// ── Componente ─────────────────────────────────────────────────────────────

/** Sufixo ordinal em pt-BR (1 → "1º", 2 → "2º"...). Singular apenas — "21º pedido". */
function ordinalPtBR(n: number): string {
  return `${n}º`;
}

export function OrderCard({ order, onOpen, className }: OrderCardProps) {
  const { acceptOrder, markReady, callDelivery, markDelivered } = useAdminOrdersStore();
  const unacknowledgedIds = useAdminOrdersStore((s) => s.unacknowledgedIds);
  const getCustomerOrderOrdinal = useAdminOrdersStore((s) => s.getCustomerOrderOrdinal);
  const isNew = unacknowledgedIds.has(order.id);
  const ordinal = getCustomerOrderOrdinal(order.id);

  // Timer: minutos em PREPARANDO — atualiza a cada 30 s
  const [elapsedMinutes, setElapsedMinutes] = useState<number | null>(null);

  useEffect(() => {
    const preparingEntry =
      order.status === "PREPARANDO"
        ? [...order.statusHistory].reverse().find((e) => e.status === "PREPARANDO")
        : undefined;

    if (!preparingEntry) {
      const id = setTimeout(() => setElapsedMinutes(null), 0);
      return () => clearTimeout(id);
    }

    const interval = setInterval(() => setElapsedMinutes(minutesSince(preparingEntry.at)), 30_000);
    // seed imediato via setTimeout para não chamar setState de forma síncrona no effect
    const seed = setTimeout(() => setElapsedMinutes(minutesSince(preparingEntry.at)), 0);

    return () => {
      clearInterval(interval);
      clearTimeout(seed);
    };
  }, [order.status, order.statusHistory]);

  const handleOpen = useCallback(() => {
    onOpen(order.id);
  }, [onOpen, order.id]);

  const badge = STATUS_BADGE[order.status];
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  // Pedido em PREPARANDO há >30min = atrasado (border + timer destacado)
  const isDelayed =
    order.status === "PREPARANDO" && elapsedMinutes !== null && elapsedMinutes >= 30;

  // CTA herda cor do status atual — vínculo visual badge↔ação
  const ctaCommonClass = cn(
    "flex-1 rounded-sm py-1.5 text-[11px] font-semibold transition",
    badge.ctaClass,
  );

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-paper-50 p-3 shadow-sm transition-shadow hover:shadow-md",
        isNew
          ? "border-terra-500"
          : isDelayed
            ? "border-terra-500/60 bg-terra-500/5"
            : "border-divider",
        className,
      )}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleOpen()}
      aria-label={`Pedido ${order.id} de ${order.customerName}`}
    >
      {/* Badge "novo" no canto */}
      {isNew && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-terra-500 text-caption leading-none font-bold text-paper-50"
        >
          N
        </span>
      )}

      {/* Header: ID + badge status compacto */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-tight text-olive-900">#{order.id}</span>
        <span
          className={cn(
            "inline-flex items-center rounded-pill px-1.5 py-0 text-[10px] leading-4 font-semibold",
            badge.badgeClass,
          )}
        >
          {badge.label}
        </span>
      </div>

      {/* Cliente + ordinal discreto + hora */}
      <div className="flex flex-col gap-0">
        <p className="truncate text-caption font-semibold text-olive-900">{order.customerName}</p>
        {ordinal > 1 && (
          <p className="text-[10px] leading-tight text-olive-700/70">
            {ordinalPtBR(ordinal)} pedido
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-olive-700">
          {formatTime(order.createdAt)} · {itemCount} {itemCount === 1 ? "item" : "itens"}
        </p>
      </div>

      {/* Timer PREPARANDO */}
      {order.status === "PREPARANDO" && elapsedMinutes !== null && (
        <p
          className={cn(
            "text-[10px] font-semibold",
            elapsedMinutes >= 30 ? "text-error" : "text-olive-700",
          )}
          aria-label={`${elapsedMinutes} minutos preparando`}
        >
          {elapsedMinutes} min preparando
        </p>
      )}

      {/* Total */}
      <p className="text-caption font-bold text-olive-900">{formatBRL(order.total)}</p>

      {/* Ações primárias por status — stopPropagation para não disparar onOpen */}
      <div
        className="flex gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {order.status === "NOVO" && (
          <button type="button" onClick={() => acceptOrder(order.id)} className={ctaCommonClass}>
            Aceitar
          </button>
        )}

        {order.status === "PREPARANDO" && canTransitionTo("PREPARANDO", "PRONTO") && (
          <button type="button" onClick={() => markReady(order.id)} className={ctaCommonClass}>
            Marcar pronto
          </button>
        )}

        {order.status === "PRONTO" && (
          <button type="button" onClick={() => callDelivery(order.id)} className={ctaCommonClass}>
            Chamar entregador
          </button>
        )}

        {order.status === "A_CAMINHO" && (
          <button type="button" onClick={() => markDelivered(order.id)} className={ctaCommonClass}>
            Confirmar entrega
          </button>
        )}
      </div>
    </div>
  );
}
