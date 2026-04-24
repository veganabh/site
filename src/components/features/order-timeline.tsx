"use client";

import { Check, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/order";
import { MOCK_DELIVERY_PERSONS } from "@/lib/mock-delivery-persons";

// ── Label afetiva por status ───────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  NOVO: "Recebemos seu pedido",
  PREPARANDO: "Preparando com carinho",
  PRONTO: "Pronto — logo vai sair",
  A_CAMINHO: "Saiu pra entrega — tá indo aí",
  ENTREGUE: "Entregue",
  CANCELADO: "Pedido cancelado",
};

// Sequência linear (cancelado é terminal separado)
const FLOW_STEPS: OrderStatus[] = ["NOVO", "PREPARANDO", "PRONTO", "A_CAMINHO", "ENTREGUE"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function findHistoryEntry(order: Order, status: OrderStatus): { at: string } | undefined {
  return order.statusHistory.find((h) => h.status === status);
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

type StepDotProps = {
  state: "done" | "active" | "pending";
};

function StepDot({ state }: StepDotProps) {
  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf-500"
      >
        <Check className="h-3.5 w-3.5 text-paper-50" strokeWidth={2.5} />
      </span>
    );
  }

  if (state === "active") {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-full bg-terra-500"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-divider bg-paper-50"
    />
  );
}

// ── Mapa índice de status ─────────────────────────────────────────────────────

function statusIndex(status: OrderStatus): number {
  return FLOW_STEPS.indexOf(status);
}

// ── Componente principal ──────────────────────────────────────────────────────

type OrderTimelineProps = {
  order: Order;
};

export function OrderTimeline({ order }: OrderTimelineProps) {
  const isCancelled = order.status === "CANCELADO";
  const currentIdx = statusIndex(order.status);

  // Entregador — busca pelo deliveryCallId no pool mock
  const deliveryPerson = order.deliveryCallId
    ? MOCK_DELIVERY_PERSONS.find((p) => p.id === order.deliveryCallId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Cancelamento: card de alerta vermelho */}
      {isCancelled && (
        <div role="alert" className="rounded-xl bg-terra-700 px-4 py-3 text-paper-50">
          <p className="text-[13px] font-bold">Pedido cancelado</p>
          {order.cancelReason && (
            <p className="mt-0.5 text-[12px] text-paper-50/85">{order.cancelReason}</p>
          )}
        </div>
      )}

      {/* Stepper linear */}
      <ol className="flex flex-col gap-0" aria-label="Linha do tempo do pedido">
        {FLOW_STEPS.map((step, idx) => {
          const historyEntry = findHistoryEntry(order, step);
          const isDone = isCancelled ? historyEntry !== undefined : currentIdx > idx;
          const isActive = !isCancelled && currentIdx === idx;

          const dotState: "done" | "active" | "pending" = isDone
            ? "done"
            : isActive
              ? "active"
              : "pending";
          // "pending" calculado implicitamente pelo dotState acima

          const isLast = idx === FLOW_STEPS.length - 1;

          return (
            <li key={step} className="flex gap-3">
              {/* Coluna dot + linha vertical */}
              <div className="flex flex-col items-center">
                <StepDot state={dotState} />
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className={cn("my-1 w-px flex-1", isDone ? "bg-leaf-500" : "bg-divider")}
                    style={{ minHeight: "20px" }}
                  />
                )}
              </div>

              {/* Coluna texto */}
              <div className="pt-0.5 pb-4">
                <p
                  className={cn(
                    "text-[13px] leading-snug font-semibold",
                    isActive ? "text-terra-700" : isDone ? "text-olive-900" : "text-olive-700/50",
                  )}
                >
                  {STATUS_LABEL[step]}
                </p>

                {historyEntry ? (
                  <p
                    className={cn(
                      "mt-0.5 text-[11.5px] tabular-nums",
                      isDone || isActive ? "text-olive-700" : "text-olive-700/40",
                    )}
                  >
                    {formatTime(historyEntry.at)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11.5px] text-olive-700/30">—</p>
                )}

                {/* Card entregador quando A_CAMINHO */}
                {step === "A_CAMINHO" && isActive && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-divider bg-paper-50 px-3 py-2">
                    {deliveryPerson ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-semibold text-olive-900">
                            {deliveryPerson.name}
                          </span>
                          <a
                            href={`tel:${deliveryPerson.phone.replace(/\D/g, "")}`}
                            className="mt-0.5 flex items-center gap-1 text-[11px] text-terra-700"
                          >
                            <Phone className="h-3 w-3" aria-hidden="true" />
                            {deliveryPerson.phone}
                          </a>
                        </div>
                      </>
                    ) : (
                      <p className="text-[12px] text-olive-700">Motoqueiro a caminho</p>
                    )}
                  </div>
                )}

                {/* CTA avaliar quando ENTREGUE */}
                {step === "ENTREGUE" && (isDone || isActive) && (
                  <button
                    type="button"
                    disabled
                    className="mt-2 cursor-not-allowed rounded-pill border border-divider bg-paper-100 px-3 py-1 text-[11px] font-semibold text-olive-700/50"
                    title="Em breve"
                  >
                    Avaliar pedido
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
