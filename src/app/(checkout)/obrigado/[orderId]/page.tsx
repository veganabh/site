import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Check, MessageCircle, Package } from "lucide-react";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { getOrderById } from "@/server/orders";
import { formatBRL } from "@/lib/format";
import { PixPaymentPanel } from "@/components/checkout/pix-payment-panel";
import { Card } from "@/components/ui/card";

type PaymentRow = {
  status: "pending" | "paid" | "failed" | "refunded";
  provider: "abacatepay" | "manual";
  raw_payload: {
    brCode?: string;
    brCodeBase64?: string;
    expiresAt?: string;
    devMode?: boolean;
  } | null;
};

export const metadata: Metadata = {
  title: "Pedido recebido — Veg.ana",
  description: "Pedido registrado. Confirmação em instantes via WhatsApp.",
};

/**
 * Página de confirmação pós-checkout. Pedido já foi criado server-side via
 * `placeOrderAction`. Aqui apenas mostramos resumo + próximo passo.
 *
 * Fluxo atual (pré-AbacatePay): mãe abre kanban, vê pedido, dispara WhatsApp
 * com QR PIX manual ou combina pagamento na entrega. Quando AbacatePay
 * liberar, esta página passa a renderizar QR Code direto.
 */
export default async function ObrigadoPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/obrigado/${orderId}`);
  }

  const order = await getOrderById(orderId);
  if (!order) {
    notFound();
  }

  if (order.customerId !== user.id) {
    notFound();
  }

  const { data: paymentRow } = await supabase
    .from("payments")
    .select("status, provider, raw_payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payment = paymentRow as PaymentRow | null;
  const pix =
    payment?.provider === "abacatepay" &&
    payment.raw_payload?.brCode &&
    payment.raw_payload?.brCodeBase64 &&
    payment.raw_payload?.expiresAt
      ? {
          brCode: payment.raw_payload.brCode,
          brCodeBase64: payment.raw_payload.brCodeBase64,
          expiresAt: payment.raw_payload.expiresAt,
          devMode: Boolean(payment.raw_payload.devMode),
          status: payment.status,
        }
      : null;

  const fallback = payment?.provider === "manual" || payment === null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 pt-4 pb-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-500/10"
        >
          <Check className="h-7 w-7 text-leaf-700" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-olive-900">Pedido recebido</h1>
          <p className="text-body-sm text-olive-700">
            Pedido <strong>#{order.orderNumber}</strong> registrado.
            {pix
              ? " Pague com PIX abaixo — a confirmação chega aqui na hora."
              : " A Veg.ana vai te chamar no WhatsApp em instantes pra confirmar pagamento."}
          </p>
        </div>
      </header>

      {pix ? (
        <PixPaymentPanel
          orderId={order.id}
          amount={order.total}
          brCode={pix.brCode}
          brCodeBase64={pix.brCodeBase64}
          expiresAt={pix.expiresAt}
          initialStatus={pix.status}
          devMode={pix.devMode}
        />
      ) : null}

      {fallback ? (
        <section
          aria-label="Pagamento manual"
          className="flex items-start gap-3 rounded-sm border border-divider bg-paper-100 p-4"
        >
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-terra-700" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-body-sm font-semibold text-olive-900">
              Pagamento será combinado no WhatsApp
            </p>
            <p className="text-caption text-olive-700">
              Não foi possível gerar o PIX automático. A Veg.ana vai te chamar no WhatsApp nos
              próximos minutos pra finalizar.
            </p>
          </div>
        </section>
      ) : null}

      <Card
        as="section"
        aria-label="Resumo do pedido"
        padding="none"
        className="flex flex-col gap-3 p-4 md:p-5"
      >
        <h2 className="inline-flex items-center gap-2 text-body-sm font-semibold text-olive-900">
          <Package className="h-4 w-4" aria-hidden="true" />
          Itens
        </h2>
        <ul className="flex flex-col gap-2">
          {order.items.map((item, idx) => (
            <li
              key={`${item.productId}-${idx}`}
              className="flex items-baseline justify-between gap-3 text-body-sm"
            >
              <span className="min-w-0 flex-1 truncate text-olive-900">
                {item.qty}× {item.productName}
              </span>
              <span className="shrink-0 font-semibold text-olive-900 tabular-nums">
                {formatBRL(item.unitPriceSite * item.qty)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-1 border-t border-divider pt-3 text-caption">
          <div className="flex justify-between">
            <dt className="text-olive-700">Subtotal</dt>
            <dd className="font-semibold text-olive-900 tabular-nums">
              {formatBRL(order.subtotal)}
            </dd>
          </div>
          {order.shippingFee > 0 ? (
            <div className="flex justify-between">
              <dt className="text-olive-700">Entrega</dt>
              <dd className="font-semibold text-olive-900 tabular-nums">
                {formatBRL(order.shippingFee)}
              </dd>
            </div>
          ) : null}
          {order.discountTotal > 0 ? (
            <div className="flex justify-between">
              <dt className="text-olive-700">Desconto</dt>
              <dd className="font-semibold text-terra-700 tabular-nums">
                −{formatBRL(order.discountTotal)}
              </dd>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between border-t border-divider pt-2">
            <dt className="text-body-sm font-semibold text-olive-900">Total</dt>
            <dd className="text-h3 font-bold text-olive-900 tabular-nums">
              {formatBRL(order.total)}
            </dd>
          </div>
        </dl>
      </Card>

      <section
        aria-label="Próximo passo"
        className="flex items-start gap-3 rounded-sm border border-divider bg-leaf-500/5 p-4"
      >
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-leaf-700" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="text-body-sm font-semibold text-olive-900">Próximo passo</p>
          <p className="text-caption text-olive-700">
            Situação atual:{" "}
            <strong>
              {order.paymentStatus === "PAGO"
                ? "Pago — a Veg.ana já está na cozinha"
                : order.paymentStatus === "ESTORNADO"
                  ? "Pagamento estornado"
                  : "Aguardando pagamento"}
            </strong>
            . Acompanhe o pedido na{" "}
            <Link href="/conta" className="font-semibold text-terra-700 hover:text-terra-500">
              sua conta
            </Link>
            .
          </p>
        </div>
      </section>

      <Link
        href="/"
        className="inline-flex h-11 items-center justify-center rounded-full bg-olive-900 px-5 text-body-sm font-semibold text-paper-50 hover:bg-olive-700"
      >
        Voltar pro cardápio
      </Link>
    </main>
  );
}
