"use client";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

type OrderStatusBadgeProps = {
  status: OrderStatus;
  className?: string;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  NOVO: {
    label: "Recebido",
    classes: "bg-paper-100 text-olive-900",
  },
  PREPARANDO: {
    label: "Preparando",
    classes: "bg-terra-500/10 text-terra-700",
  },
  PRONTO: {
    label: "Pronto",
    classes: "bg-leaf-500/10 text-leaf-700",
  },
  A_CAMINHO: {
    label: "A caminho",
    classes: "bg-olive-900 text-paper-50",
  },
  ENTREGUE: {
    label: "Entregue",
    classes: "bg-paper-50 text-olive-700 border border-divider",
  },
  CANCELADO: {
    // terra-700 sobre paper-50 → ratio 4,64 AA (terra-500 só passa AA-large, insuficiente para 11px)
    label: "Cancelado",
    classes: "bg-terra-700 text-paper-50",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2 py-0.5 text-micro leading-tight font-semibold",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
