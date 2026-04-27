import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseServiceClient } from "@/server/supabase/service";
import { checkPixCharge, mapPixStatusToPaymentStatus } from "@/server/payments/abacatepay";

/**
 * Polling endpoint pra obrigado page checar status do PIX.
 *
 * Fluxo:
 * 1. Auth obrigatória (RLS no SELECT já filtra, mas exigimos user válido).
 * 2. Lê payment row mais recente do pedido.
 * 3. Se já está `paid`/`failed`/`refunded`, retorna sem chamar gateway.
 * 4. Se `pending` + provider `abacatepay` + `provider_charge_id` presente,
 *    chama `pixQrCode.check`. Em caso de mudança, atualiza payment row e,
 *    em PAID, marca `orders.payment_status = 'PAGO'`.
 *
 * Webhook (ADR 0009 D4) é caminho canônico em prod — esse endpoint é fallback
 * UX (cliente paga, espera 2s, vê confirmação sem refresh manual).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS garante que `profile_id = auth.uid() OR is_admin()`.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[payments/status] order lookup:", orderError.message);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, provider, provider_charge_id, status, paid_at, raw_payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    console.error("[payments/status] payment lookup:", paymentError.message);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!payment) {
    return NextResponse.json({ status: "missing", orderPaymentStatus: order.payment_status });
  }

  // Estado terminal — sem refresh.
  if (payment.status !== "pending") {
    return NextResponse.json({
      status: payment.status,
      orderPaymentStatus: order.payment_status,
      paidAt: payment.paid_at,
    });
  }

  // Sem charge no gateway (fallback manual ou abacatepay sem id) — só ecoa.
  if (payment.provider !== "abacatepay" || !payment.provider_charge_id) {
    return NextResponse.json({
      status: payment.status,
      orderPaymentStatus: order.payment_status,
      provider: payment.provider,
    });
  }

  const check = await checkPixCharge(payment.provider_charge_id);
  if (!check.ok) {
    console.error("[payments/status] checkPixCharge:", check.error);
    return NextResponse.json({
      status: payment.status,
      orderPaymentStatus: order.payment_status,
      gatewayError: true,
    });
  }

  const nextStatus = mapPixStatusToPaymentStatus(check.charge.status);
  if (nextStatus === payment.status) {
    return NextResponse.json({
      status: payment.status,
      orderPaymentStatus: order.payment_status,
    });
  }

  const service = createSupabaseServiceClient();
  const paidAt = nextStatus === "paid" ? new Date().toISOString() : null;

  // Endpoint /transparents/check só retorna id+status+expiresAt — preservar
  // brCode/brCodeBase64 originais salvos no momento da criação. Sobrescrever
  // tudo zeraria o QR e quebraria refresh manual da página /obrigado.
  const previousPayload =
    payment.raw_payload && typeof payment.raw_payload === "object"
      ? (payment.raw_payload as Record<string, unknown>)
      : {};

  const { error: updateError } = await service
    .from("payments")
    .update({
      status: nextStatus,
      paid_at: paidAt,
      raw_payload: {
        ...previousPayload,
        expiresAt: check.charge.expiresAt,
        status: check.charge.status,
      },
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("[payments/status] payment update:", updateError.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  let nextOrderPaymentStatus = order.payment_status;
  if (nextStatus === "paid" && order.payment_status !== "PAGO") {
    const { error: orderUpdateError } = await service
      .from("orders")
      .update({ payment_status: "PAGO" })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("[payments/status] order update:", orderUpdateError.message);
    } else {
      nextOrderPaymentStatus = "PAGO";
    }
  }

  return NextResponse.json({
    status: nextStatus,
    orderPaymentStatus: nextOrderPaymentStatus,
    paidAt,
  });
}
