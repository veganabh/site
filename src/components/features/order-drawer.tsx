"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Phone, MapPin, Package, Tag, Truck, MessageCircle } from "lucide-react";
import type { OrderStatus } from "@/types/order";
import { canTransitionTo, isTerminal } from "@/types/order";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { useDeliveryPersonsStore } from "@/stores/delivery-persons-store";
import { formatBRL } from "@/lib/format";
import { CancelReasonDialog } from "@/components/features/cancel-reason-dialog";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Telefone do cliente → link wa.me (abre WhatsApp Web/app). Normaliza p/ E.164
 * só-dígitos: tira tudo que não é número; prefixa 55 (Brasil) se vier sem DDI.
 */
function waLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  NOVO: "Novo",
  PREPARANDO: "Preparando",
  PRONTO: "Pronto",
  A_CAMINHO: "A caminho",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-caption font-bold tracking-widest text-olive-700 uppercase">
      {children}
    </p>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

type OrderDrawerProps = {
  orderId: string | null;
  onClose: () => void;
};

// ── Componente ─────────────────────────────────────────────────────────────

export function OrderDrawer({ orderId, onClose }: OrderDrawerProps) {
  const orders = useAdminOrdersStore((s) => s.orders);
  const {
    acceptOrder,
    rejectOrder,
    markReady,
    callDelivery,
    markDelivered,
    cancelOrder,
    acknowledgeOrder,
  } = useAdminOrdersStore();

  const order = orders.find((o) => o.id === orderId) ?? null;

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState<"reject" | "cancel">("cancel");

  // Reconhece pedido ao abrir o drawer
  useEffect(() => {
    if (orderId) acknowledgeOrder(orderId);
  }, [orderId, acknowledgeOrder]);

  const findDeliveryPerson = useDeliveryPersonsStore((s) => s.findById);
  const deliveryPerson = findDeliveryPerson(order?.deliveryCallId);

  function handleCancel() {
    setCancelMode("cancel");
    setCancelDialogOpen(true);
  }

  function handleReject() {
    setCancelMode("reject");
    setCancelDialogOpen(true);
  }

  function handleCancelConfirm(reason: string) {
    if (!order) return;
    if (cancelMode === "reject") {
      rejectOrder(order.id, reason);
    } else {
      cancelOrder(order.id, reason);
    }
    onClose();
  }

  const open = orderId !== null && order !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        {/* Drawer lateral direita */}
        <DialogContent variant="drawer" aria-describedby="order-drawer-description">
          {!order ? null : (
            <>
              {/* Header — fixo */}
              <div className="flex shrink-0 items-center justify-between border-b border-divider px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-body font-bold text-olive-900">
                    Pedido #{order.orderNumber}
                  </DialogTitle>
                  <p id="order-drawer-description" className="text-caption text-olive-700">
                    {formatDateTime(order.createdAt)} · {STATUS_LABELS[order.status]}
                  </p>
                </div>
                <DialogClose
                  aria-label="Fechar"
                  className="rounded-sm p-1.5 text-olive-700 transition hover:bg-paper-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-900"
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </DialogClose>
              </div>

              {/* Corpo — scrollável */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex flex-col gap-6">
                  {/* Cliente */}
                  <section aria-labelledby="section-cliente">
                    <SectionLabel>Cliente</SectionLabel>
                    <div className="flex flex-col gap-2 rounded-sm border border-divider bg-paper-100 px-4 py-3">
                      <Link
                        href={`/gestao/clientes/${encodeURIComponent(order.customerPhone)}`}
                        className="group inline-flex w-fit items-center gap-1.5 text-body-sm font-semibold text-olive-900 underline-offset-2 hover:text-terra-700 hover:underline"
                      >
                        {order.customerName}
                        <span
                          aria-hidden="true"
                          className="text-caption text-olive-700 transition group-hover:text-terra-700"
                        >
                          ›
                        </span>
                      </Link>
                      <a
                        href={waLink(order.customerPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-body-sm text-olive-700 hover:text-olive-900"
                      >
                        <MessageCircle
                          className="h-3.5 w-3.5 shrink-0 text-leaf-700"
                          aria-hidden="true"
                        />
                        {order.customerPhone}
                      </a>
                      <div className="flex items-start gap-2 text-body-sm text-olive-700">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {order.shippingAddress.street}, {order.shippingAddress.number}
                          {order.shippingAddress.complement &&
                            `, ${order.shippingAddress.complement}`}{" "}
                          — {order.shippingAddress.neighborhood}, {order.shippingAddress.cep}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Itens */}
                  <section aria-labelledby="section-itens">
                    <SectionLabel>
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3 w-3" aria-hidden="true" />
                        Itens
                      </span>
                    </SectionLabel>
                    <ul className="flex flex-col gap-2">
                      {order.items.map((item, idx) => (
                        <li
                          key={`${item.productId}-${idx}`}
                          className="flex items-start justify-between gap-3 rounded-sm border border-divider bg-paper-100 px-4 py-3"
                        >
                          <div className="flex flex-col gap-0.5">
                            <p className="text-body-sm font-semibold text-olive-900">
                              {item.qty}× {item.productName}
                            </p>
                            {item.notes && (
                              <p className="text-caption text-olive-700 italic">
                                Obs: {item.notes}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-body-sm font-semibold text-olive-900">
                            {formatBRL(item.unitPriceSite * item.qty)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Cupom */}
                  {order.couponApplied && (
                    <section aria-labelledby="section-cupom">
                      <SectionLabel>
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3" aria-hidden="true" />
                          Cupom
                        </span>
                      </SectionLabel>
                      <div className="flex items-center justify-between rounded-sm border border-leaf-500/20 bg-leaf-500/5 px-4 py-3">
                        <span className="text-body-sm font-bold text-olive-900">
                          {order.couponApplied.code}
                        </span>
                        <span className="text-body-sm text-leaf-700">
                          − {formatBRL(order.couponApplied.discountValue)}
                        </span>
                      </div>
                    </section>
                  )}

                  {/* Resumo financeiro */}
                  <section aria-labelledby="section-total">
                    <SectionLabel>Resumo</SectionLabel>
                    <div className="flex flex-col gap-1.5 rounded-sm border border-divider bg-paper-100 px-4 py-3">
                      <div className="flex justify-between text-body-sm text-olive-700">
                        <span>Subtotal</span>
                        <span>{formatBRL(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-body-sm text-olive-700">
                        <span>Frete</span>
                        <span>
                          {order.shippingFee === 0 ? "Grátis" : formatBRL(order.shippingFee)}
                        </span>
                      </div>
                      {order.discountTotal > 0 && (
                        <div className="flex justify-between text-body-sm text-leaf-700">
                          <span>Desconto</span>
                          <span>− {formatBRL(order.discountTotal)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between border-t border-divider pt-2 text-body font-bold text-olive-900">
                        <span>Total</span>
                        <span>{formatBRL(order.total)}</span>
                      </div>
                      <p className="mt-1 text-caption text-olive-700">
                        Pagamento:{" "}
                        <span className="font-semibold">
                          {order.paymentStatus === "PAGO"
                            ? "Pago"
                            : order.paymentStatus === "ESTORNADO"
                              ? "Estornado"
                              : "Pendente"}
                        </span>
                      </p>
                    </div>
                  </section>

                  {/* Entregador (quando A_CAMINHO) */}
                  {deliveryPerson && (
                    <section aria-labelledby="section-moto">
                      <SectionLabel>
                        <span className="flex items-center gap-1.5">
                          <Truck className="h-3 w-3" aria-hidden="true" />
                          Entregador
                        </span>
                      </SectionLabel>
                      <div className="flex flex-col gap-1.5 rounded-sm border border-divider bg-paper-100 px-4 py-3">
                        <p className="text-body-sm font-semibold text-olive-900">
                          {deliveryPerson.name}
                        </p>
                        <a
                          href={`tel:${deliveryPerson.phone}`}
                          className="flex items-center gap-2 text-body-sm text-olive-700 hover:text-olive-900"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {deliveryPerson.phone}
                        </a>
                        <p className="text-caption text-olive-700">Placa: {deliveryPerson.plate}</p>
                      </div>
                    </section>
                  )}

                  {/* Histórico de status */}
                  <section aria-labelledby="section-historico">
                    <SectionLabel>Histórico</SectionLabel>
                    <ol className="flex flex-col gap-1.5">
                      {order.statusHistory.map((entry, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 text-caption text-olive-700"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-300"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-olive-900">
                            {STATUS_LABELS[entry.status]}
                          </span>
                          <span>{formatDateTime(entry.at)}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Motivo de cancelamento */}
                  {order.status === "CANCELADO" && order.cancelReason && (
                    <section aria-labelledby="section-motivo">
                      <SectionLabel>Motivo do cancelamento</SectionLabel>
                      <p className="text-body-sm text-olive-700">{order.cancelReason}</p>
                    </section>
                  )}
                </div>
              </div>

              {/* Footer — ações principais, fixo na base com respiro */}
              {!isTerminal(order.status) && (
                <div className="shrink-0 border-t border-divider bg-paper-50 px-5 pt-4 pb-6">
                  <div className="flex flex-col gap-2.5">
                    {/* Ação primária por status */}
                    {order.status === "NOVO" && (
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full"
                        onClick={() => {
                          acceptOrder(order.id);
                          onClose();
                        }}
                      >
                        Aceitar pedido
                      </Button>
                    )}

                    {order.status === "PREPARANDO" && (
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full"
                        onClick={() => {
                          markReady(order.id);
                          onClose();
                        }}
                      >
                        Marcar como pronto
                      </Button>
                    )}

                    {order.status === "PRONTO" && (
                      <button
                        type="button"
                        onClick={() => {
                          callDelivery(order.id);
                          onClose();
                        }}
                        className="w-full rounded-sm bg-terra-500 py-3 text-cta font-semibold text-paper-50 transition hover:bg-terra-700"
                      >
                        Chamar entregador
                      </button>
                    )}

                    {order.status === "A_CAMINHO" && (
                      <button
                        type="button"
                        onClick={() => {
                          markDelivered(order.id);
                          onClose();
                        }}
                        className="w-full rounded-sm bg-success py-3 text-cta font-semibold text-paper-50 transition hover:opacity-90"
                      >
                        Confirmar entrega
                      </button>
                    )}

                    {/* Cancelar — disponível em NOVO, PREPARANDO, PRONTO */}
                    {canTransitionTo(order.status, "CANCELADO") && (
                      <button
                        type="button"
                        onClick={order.status === "NOVO" ? handleReject : handleCancel}
                        className="w-full rounded-sm border border-error/30 bg-error/5 py-2.5 text-cta text-error transition hover:bg-error/10"
                      >
                        {order.status === "NOVO" ? "Recusar pedido" : "Cancelar pedido"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de motivo de cancelamento */}
      <CancelReasonDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelConfirm}
        title={cancelMode === "reject" ? "Recusar pedido" : "Cancelar pedido"}
        refundNotice={order?.paymentStatus === "PAGO"}
      />
    </>
  );
}
