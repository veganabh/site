"use client";

/**
 * Kanban de encomendas — P2 (ADR 0013).
 *
 * Status labels adaptados para contexto de encomenda:
 *  NOVO         → "Paga / Nova"
 *  PREPARANDO   → "Em produção"
 *  PRONTO       → "Pronta"
 *  A_CAMINHO    → "Saiu p/ entrega"
 *  ENTREGUE     → "Entregue"
 *
 * Reutiliza a mesma máquina de estado do kanban diário.
 * Inclui visão de calendário (agrupamento por scheduled_date).
 */

import { useState, useMemo } from "react";
import { CalendarDays, Kanban } from "lucide-react";
import type { Order, OrderStatus } from "@/types/order";
import { OrderCard } from "@/components/features/order-card";
import { OrderDrawer } from "@/components/features/order-drawer";
import { PreorderStatsStrip } from "@/components/admin/encomendas/preorder-stats-strip";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Labels específicos para encomendas (ADR 0013 D2)
const PREORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NOVO: "Nova",
  PREPARANDO: "Em produção",
  PRONTO: "Pronta",
  A_CAMINHO: "Saiu p/ entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const KANBAN_COLUMNS: readonly { status: OrderStatus; badgeClass: string }[] = [
  { status: "NOVO", badgeClass: "bg-terra-500 text-paper-50" },
  { status: "PREPARANDO", badgeClass: "bg-warning text-olive-900" },
  { status: "PRONTO", badgeClass: "bg-leaf-500 text-paper-50" },
  { status: "A_CAMINHO", badgeClass: "bg-info text-paper-50" },
  { status: "ENTREGUE", badgeClass: "bg-olive-500 text-paper-50" },
];

type View = "kanban" | "calendar";

type PreordersKanbanProps = {
  initialPreorders: Order[];
};

export function PreordersKanban({ initialPreorders }: PreordersKanbanProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [view, setView] = useState<View>("kanban");

  // Pipeline de produção = só encomendas CONFIRMADAS (pagas). ADR 0013:
  // "encomenda confirmada ao receber o pagamento". Não-pagas não entram nas
  // colunas (não se produz sem pagamento) — viram só um aviso no topo.
  const confirmed = useMemo(
    () => initialPreorders.filter((o) => o.status !== "CANCELADO" && o.paymentStatus === "PAGO"),
    [initialPreorders],
  );
  const awaitingPayment = useMemo(
    () =>
      initialPreorders.filter((o) => o.status !== "CANCELADO" && o.paymentStatus !== "PAGO").length,
    [initialPreorders],
  );

  const byStatus = useMemo(() => {
    const map = new Map<OrderStatus, Order[]>();
    for (const col of KANBAN_COLUMNS) map.set(col.status, []);
    for (const o of confirmed) {
      const col = map.get(o.status);
      if (col) col.push(o);
    }
    return map;
  }, [confirmed]);

  // Calendário: agrupa por scheduled_date
  const byDate = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of confirmed) {
      const d = o.scheduledDate ?? "sem data";
      const list = map.get(d) ?? [];
      list.push(o);
      map.set(d, list);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [confirmed]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-olive-900">Encomendas</h1>
          <p className="text-body-sm text-olive-700">
            {confirmed.length} encomenda{confirmed.length !== 1 ? "s" : ""} confirmada
            {confirmed.length !== 1 ? "s" : ""}
            {awaitingPayment > 0 && (
              <span className="text-olive-500"> · {awaitingPayment} aguardando pagamento</span>
            )}
          </p>
        </div>

        {/* Toggle de visualização */}
        <div className="flex items-center gap-1 rounded-sm border border-divider bg-paper-50 p-0.5">
          {(["kanban", "calendar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-body-sm font-medium transition",
                view === v ? "bg-olive-900 text-paper-50" : "text-olive-700 hover:text-olive-900",
              )}
            >
              {v === "kanban" ? (
                <Kanban className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {v === "kanban" ? "Kanban" : "Calendário"}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas do mês (espelha a strip dos pedidos do dia) */}
      <PreorderStatsStrip preorders={initialPreorders} />

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {KANBAN_COLUMNS.map(({ status, badgeClass }) => {
            const orders = byStatus.get(status) ?? [];
            return (
              <div key={status} className="flex flex-col gap-2">
                {/* Header da coluna — mesmo padrão do kanban de Pedidos do dia */}
                <div className="flex items-center justify-between rounded-sm bg-paper-100 px-2.5 py-1.5">
                  <p className="text-micro font-bold tracking-wide text-olive-700 uppercase">
                    {PREORDER_STATUS_LABELS[status]}
                  </p>
                  <span
                    className={cn(
                      "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro leading-none font-bold",
                      orders.length > 0 ? badgeClass : "bg-paper-50 text-olive-700",
                    )}
                  >
                    {orders.length}
                  </span>
                </div>

                {orders.length === 0 ? (
                  <p className="rounded-sm border border-dashed border-divider px-3 py-4 text-center text-caption text-olive-700">
                    Nenhuma
                  </p>
                ) : (
                  orders.map((o) => (
                    <OrderCard key={o.id} order={o} onOpen={() => setSelectedOrderId(o.id)} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="flex flex-col gap-4">
          {byDate.size === 0 ? (
            <Card padding="none" className="border-dashed p-8 text-center">
              <p className="text-body-sm text-olive-700">Nenhuma encomenda ativa.</p>
            </Card>
          ) : (
            [...byDate.entries()].map(([date, orders]) => (
              <div key={date} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-terra-500" aria-hidden="true" />
                  <h2 className="text-body font-semibold text-olive-900">
                    {date === "sem data" ? "Sem data definida" : formatScheduledDate(date)}
                  </h2>
                  <span className="text-caption text-olive-700">
                    {orders.length} encomenda{orders.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {orders
                    .sort((a, b) => (a.scheduledHour ?? 0) - (b.scheduledHour ?? 0))
                    .map((o) => (
                      <OrderCard key={o.id} order={o} onOpen={() => setSelectedOrderId(o.id)} />
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drawer de detalhes — reutiliza o componente existente */}
      <OrderDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}

function formatScheduledDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
