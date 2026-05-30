"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Volume2, VolumeX, Search } from "lucide-react";
import type { OrderStatus } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { useNewOrderNotification } from "@/hooks/use-new-order-notification";
import { OrderCard } from "@/components/features/order-card";
import { OrderDrawer } from "@/components/features/order-drawer";
import { DayStatsStrip } from "@/components/admin/orders/day-stats-strip";
import { cn } from "@/lib/utils";

// ── Configuração das colunas do kanban ─────────────────────────────────────

type KanbanColumn = {
  status: OrderStatus;
  label: string;
  emptyLabel: string;
  /** Classe do badge numérico quando a coluna tem pedidos. */
  badgeActiveClass: string;
};

const KANBAN_COLUMNS: readonly KanbanColumn[] = [
  {
    status: "NOVO",
    label: "Novos",
    emptyLabel: "Nenhum pedido novo",
    badgeActiveClass: "bg-terra-500 text-paper-50",
  },
  {
    status: "PREPARANDO",
    label: "Preparando",
    emptyLabel: "Nada em preparo",
    badgeActiveClass: "bg-warning text-olive-900",
  },
  {
    status: "PRONTO",
    label: "Pronto",
    emptyLabel: "Nenhum pronto",
    badgeActiveClass: "bg-leaf-500 text-paper-50",
  },
  {
    status: "A_CAMINHO",
    label: "A caminho",
    emptyLabel: "Nenhum a caminho",
    badgeActiveClass: "bg-info text-paper-50",
  },
  {
    status: "ENTREGUE",
    label: "Entregues",
    emptyLabel: "Nenhum entregue hoje",
    badgeActiveClass: "bg-success text-paper-50",
  },
] as const;

// ── Helper ─────────────────────────────────────────────────────────────────
// Página é dedicada ao dia corrente. Filtros Ontem/Semana migraram pra
// módulo Relatórios (roadmap). Métricas consolidadas vão no Dashboard.

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const newOrderCount = useAdminOrdersStore((s) => s.newOrderCount);

  const { soundEnabled, toggleSound } = useNewOrderNotification();

  const [search, setSearch] = useState("");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  /** Filtro "só PREPARANDO >30min" — ativado via pill da strip de métricas. */
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  /**
   * Timestamp-tick que força recálculo do filtro "atrasados" a cada 30s.
   * Atualizado só quando `onlyDelayed` está ligado (evita trabalho à toa).
   * Usamos state + effect em vez de `Date.now()` inline para manter o render puro.
   */
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!onlyDelayed) return;
    // seed via setTimeout para não chamar setState síncrono no corpo do effect
    const seed = setTimeout(() => setNowTick(Date.now()), 0);
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, [onlyDelayed]);

  const handleOpenOrder = useCallback((id: string) => {
    setOpenOrderId(id);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setOpenOrderId(null);
  }, []);

  const handleToggleOnlyDelayed = useCallback(() => {
    setOnlyDelayed((v) => !v);
  }, []);

  // Pedidos do dia (sem filtro de busca) — alimenta kanban + strip de métricas.
  // Só pedido PAGO entra: pendente de pagamento não é "pedido" ainda (cliente
  // acompanha em /conta; vira métrica de abandono nos relatórios).
  const todayOrders = useMemo(() => {
    const start = startOfToday();
    return orders.filter((o) => o.paymentStatus === "PAGO" && new Date(o.createdAt) >= start);
  }, [orders]);

  // Filtro fixo: dia corrente + busca + (opcional) só atrasados
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return todayOrders.filter((o) => {
      if (q) {
        const matches = o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (onlyDelayed) {
        if (o.status !== "PREPARANDO") return false;
        const prepEntry = o.statusHistory.find((h) => h.status === "PREPARANDO");
        if (!prepEntry) return false;
        const elapsed = (nowTick - new Date(prepEntry.at).getTime()) / 60_000;
        return elapsed >= 30;
      }
      return true;
    });
  }, [todayOrders, search, onlyDelayed, nowTick]);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-h2 font-bold text-olive-900">Pedidos do dia</h1>
          {newOrderCount > 0 && (
            <p className="text-caption font-semibold text-terra-700">
              {newOrderCount} {newOrderCount === 1 ? "pedido novo" : "pedidos novos"}
            </p>
          )}
        </div>

        {/* Controles direita */}
        <div className="flex items-center gap-2">
          {/* Busca */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-olive-700"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por #ID ou nome"
              className={cn(
                "h-8 w-52 rounded-sm border border-divider bg-paper-50 pr-3 pl-8",
                "text-caption text-olive-900 placeholder:text-olive-700",
                "focus:border-olive-900 focus:outline-none",
              )}
            />
          </div>

          {/* Toggle som */}
          <button
            type="button"
            onClick={toggleSound}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-sm border transition",
              soundEnabled
                ? "border-olive-900 bg-olive-900 text-paper-50"
                : "border-divider bg-paper-50 text-olive-700 hover:border-sage-300",
            )}
            aria-label={soundEnabled ? "Desativar som" : "Ativar som"}
            title={soundEnabled ? "Som ativado" : "Som desativado"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Strip de métricas do dia */}
      <DayStatsStrip
        orders={todayOrders}
        onlyDelayedActive={onlyDelayed}
        onToggleOnlyDelayed={handleToggleOnlyDelayed}
      />

      {/* Banner filtro ativo */}
      {onlyDelayed && (
        <div className="flex items-center justify-between rounded-sm border border-terra-500/30 bg-terra-500/5 px-3 py-1.5">
          <span className="text-caption font-semibold text-terra-700">
            Mostrando apenas pedidos parados há mais de 30 min
          </span>
          <button
            type="button"
            onClick={handleToggleOnlyDelayed}
            className="text-caption font-semibold text-olive-700 underline-offset-2 hover:underline"
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* Kanban — 5 colunas com scroll horizontal em mobile */}
      <div
        role="region"
        aria-label="Kanban de pedidos do dia"
        className="flex flex-1 gap-3 overflow-x-auto pb-4"
        style={{ minHeight: 0 }}
      >
        {KANBAN_COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.status);

          return (
            <div key={col.status} className="flex min-w-[180px] flex-1 flex-col gap-2">
              {/* Header da coluna */}
              <div className="flex items-center justify-between rounded-sm bg-paper-100 px-2.5 py-1.5">
                <p className="text-micro font-bold tracking-wide text-olive-700 uppercase">
                  {col.label}
                </p>
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro leading-none font-bold",
                    colOrders.length > 0 ? col.badgeActiveClass : "bg-paper-50 text-olive-700",
                  )}
                  aria-label={`${colOrders.length} ${colOrders.length === 1 ? "pedido" : "pedidos"}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <p className="px-3 py-4 text-center text-micro text-olive-700">
                    {col.emptyLabel}
                  </p>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onOpen={handleOpenOrder} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer lateral de detalhe */}
      <OrderDrawer orderId={openOrderId} onClose={handleCloseDrawer} />
    </div>
  );
}
