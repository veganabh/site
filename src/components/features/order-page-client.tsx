"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useSession } from "@/lib/auth/use-session";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { OrderTimeline } from "@/components/features/order-timeline";
import { OrderStatusBadge } from "@/components/features/order-status-badge";
import { formatBRL } from "@/lib/format";
import { STORE_LOCATION } from "@/lib/store-location";
import type { Order } from "@/types/order";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── ETA estimado simples ───────────────────────────────────────────────────────

function estimateEta(order: Order): string | null {
  if (!["PREPARANDO", "PRONTO", "A_CAMINHO"].includes(order.status)) return null;
  const base = new Date(order.createdAt);
  if (Number.isNaN(base.getTime())) return null;
  const etaMin = new Date(base.getTime() + 45 * 60 * 1000);
  const etaMax = new Date(base.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(etaMin)}–${fmt(etaMax)}`;
}

// ── Toast discreto ────────────────────────────────────────────────────────────

type StatusToastProps = {
  visible: boolean;
};

function StatusToast({ visible }: StatusToastProps) {
  return (
    <div
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-olive-900 px-4 py-2 text-caption font-semibold text-paper-50 shadow-lg transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"} `}
    >
      Status atualizado
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

type OrderPageClientProps = {
  orderId: string;
};

export function OrderPageClient({ orderId }: OrderPageClientProps) {
  const router = useRouter();
  const { status: authStatus } = useSession();

  // Redireciona anon → /conta
  useEffect(() => {
    if (authStatus === "anon") {
      router.replace("/conta");
    }
  }, [authStatus, router]);

  // Lê pedido reativo da store admin (fonte de verdade compartilhada)
  const order = useAdminOrdersStore((s) => s.orders.find((o) => o.id === orderId));

  // Toast de status atualizado
  const [toastVisible, setToastVisible] = useState(false);
  const prevStatusRef = useRef<string | undefined>(order?.status);

  useEffect(() => {
    if (!order) return;
    if (prevStatusRef.current !== undefined && prevStatusRef.current !== order.status) {
      setToastVisible(true);
      const t = setTimeout(() => setToastVisible(false), 2800);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = order.status;
  }, [order?.status, order]);

  // Enquanto carrega a sessão
  if (authStatus === "anon") {
    return null; // redireciona no useEffect
  }

  // Pedido não encontrado (improvável — page.tsx faz notFound() antes, mas por segurança)
  if (!order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-body-sm text-olive-700">Pedido não encontrado.</p>
        <Link
          href="/conta"
          className="mt-4 inline-flex text-body-sm font-semibold text-terra-700 underline"
        >
          Voltar pra conta
        </Link>
      </main>
    );
  }

  // TODO: validar Order.customerId === session.user.id pós-migração
  // Por enquanto: qualquer usuário logado pode ver qualquer pedido (mock simplificado).

  const eta = estimateEta(order);
  const waUrl = `https://wa.me/${STORE_LOCATION.whatsappNumber}?text=Olá,%20preciso%20de%20ajuda%20com%20o%20pedido%20${order.id}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Voltar */}
      <Link
        href="/conta"
        className="mb-4 inline-flex items-center gap-1.5 text-caption font-semibold text-olive-700 transition hover:text-olive-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Minha conta
      </Link>

      {/* Cabeçalho */}
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-body-lg font-bold text-olive-900">Pedido #{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-caption text-olive-700">{formatDateTime(order.createdAt)}</p>

        {/* ETA */}
        {eta && (
          <p className="mt-2 rounded-sm bg-terra-500/10 px-3 py-1.5 text-caption font-semibold text-terra-700">
            Previsão de entrega: {eta}
          </p>
        )}
      </header>

      {/* Timeline */}
      <section aria-labelledby="timeline-titulo" className="mb-6">
        <h2 id="timeline-titulo" className="sr-only">
          Linha do tempo do pedido
        </h2>
        <OrderTimeline order={order} />
      </section>

      {/* Itens do pedido */}
      <section aria-labelledby="itens-titulo" className="mb-6">
        <h2
          id="itens-titulo"
          className="mb-2 text-body-sm font-semibold tracking-wide text-olive-700 uppercase"
        >
          Itens
        </h2>
        <ul className="flex flex-col gap-1.5 rounded-sm border border-divider bg-paper-50 px-3 py-2">
          {order.items.map((item) => (
            <li
              key={`${order.id}-${item.productId}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-body-sm text-olive-900">
                {item.qty}× {item.productName}
              </span>
              <span className="shrink-0 text-body-sm font-semibold text-olive-900 tabular-nums">
                {formatBRL(item.unitPriceSite * item.qty)}
              </span>
            </li>
          ))}

          {/* Linha frete */}
          {order.shippingFee > 0 && (
            <li className="mt-0.5 flex items-center justify-between gap-2 border-t border-divider pt-1.5">
              <span className="text-caption text-olive-700">Frete</span>
              <span className="text-caption text-olive-700 tabular-nums">
                {formatBRL(order.shippingFee)}
              </span>
            </li>
          )}

          {/* Desconto cupom */}
          {order.couponApplied && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-caption text-leaf-700">Cupom {order.couponApplied.code}</span>
              <span className="text-caption text-leaf-700 tabular-nums">
                −{formatBRL(order.couponApplied.discountValue)}
              </span>
            </li>
          )}

          {/* Total */}
          <li className="mt-0.5 flex items-center justify-between gap-2 border-t border-divider pt-1.5">
            <span className="text-body-sm font-bold text-olive-900">Total</span>
            <span className="text-body-sm font-bold text-olive-900 tabular-nums">
              {formatBRL(order.total)}
            </span>
          </li>
        </ul>
      </section>

      {/* CTA WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-paper-50 px-4 py-2.5 text-body-sm font-semibold text-olive-900 transition hover:bg-paper-100"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Precisa de ajuda?
      </a>

      {/* Toast de atualização em tempo real */}
      <StatusToast visible={toastVisible} />
    </main>
  );
}
