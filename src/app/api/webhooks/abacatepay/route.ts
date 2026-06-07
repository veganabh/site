import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServiceClient } from "@/server/supabase/service";
import { ABACATEPAY_PUBLIC_KEY, mapPixStatusToPaymentStatus } from "@/server/payments/abacatepay";
import { sendPurchaseToMeta } from "@/server/payments/meta-capi";

/**
 * Webhook AbacatePay — fonte canônica de status de pagamento (ADR 0009 D4).
 *
 * **Validação:**
 * Header `X-Webhook-Signature` precisa bater com HMAC-SHA256 (base64) do body
 * cru usando `ABACATEPAY_WEBHOOK_SECRET` — secret específico do webhook v2,
 * configurado no dashboard AbacatePay no momento da criação. Garante
 * integridade + autenticidade num só passo (atacante sem o secret não
 * consegue forjar HMAC válido).
 *
 * **Idempotência:**
 * - Cada evento gera `idempotency_key = ${event}:${transparent.id}:${updatedAt}`.
 * - Antes de aplicar, verifica se a payment row já tem essa chave — se sim,
 *   é replay do AbacatePay (retry por timeout) → retorna 200 sem side-effect.
 * - Caso contrário, atualiza status + idempotency_key.
 *
 * **Eventos consumidos (Sprint 1, ADR 0009 D5):**
 *  - `transparent.completed` → marca como PAGO.
 *  - `transparent.refunded`  → marca como ESTORNADO.
 *  - `transparent.disputed`  → log + status `failed`. Mãe trata manual.
 *
 * Para os fluxos de checkout hospedado (`billing.*`) e payouts/transfers,
 * ainda fora de escopo do Sprint 1 — caem no branch `default` e ignoram.
 */

const chargeShape = z
  .object({
    id: z.string(),
    status: z.enum(["PENDING", "EXPIRED", "CANCELLED", "PAID", "REFUNDED"]),
    amount: z.number().nullish(),
    paidAmount: z.number().nullish(),
    updatedAt: z.string(),
    externalId: z.string().nullish(),
    devMode: z.boolean().nullish(),
  })
  .passthrough();

const webhookSchema = z.object({
  event: z.string(),
  apiVersion: z.union([z.number(), z.string()]).optional(),
  devMode: z.boolean().optional(),
  data: z
    .object({
      // PIX transparente — `transparent.completed`, etc.
      transparent: chargeShape.optional(),
      // Checkout hospedado — `checkout.completed`, etc.
      checkout: chargeShape.optional(),
    })
    .passthrough(),
});

export async function POST(request: Request) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[abacatepay-webhook] ABACATEPAY_WEBHOOK_SECRET não configurado.");
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  // Read body cru ANTES de parse — HMAC valida bytes exatos enviados.
  const rawBody = await request.text();

  const headerSignature = request.headers.get("x-webhook-signature");
  if (!headerSignature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  // Tenta com secret do .env.local primeiro (webhook v2 com Secret próprio).
  // Fallback: chave pública AbacatePay constante (modelo v1, ainda usado em
  // alguns webhooks legados).
  const valid =
    verifySignature(rawBody, headerSignature, secret) ||
    verifySignature(rawBody, headerSignature, ABACATEPAY_PUBLIC_KEY);

  if (!valid) {
    if (process.env.ABACATEPAY_WEBHOOK_DEBUG === "1") {
      const debug = {
        bodyLen: rawBody.length,
        bodyHead: rawBody.slice(0, 80),
        receivedSig: headerSignature.slice(0, 24) + "…",
        expectedSecret: signaturePreview(rawBody, secret),
        expectedPublic: signaturePreview(rawBody, ABACATEPAY_PUBLIC_KEY),
      };
      console.error("[abacatepay-webhook] sig mismatch:", debug);
    }
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("[abacatepay-webhook] payload shape:", parsed.error.flatten());
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { event, data } = parsed.data;
  // Aceita tanto `data.transparent` (PIX) quanto `data.checkout` (cartão).
  // Se ambos vierem (improvável), `transparent` ganha — eventos PIX são mais
  // sensíveis no nosso fluxo.
  const charge = data.transparent ?? data.checkout;

  // Eventos sem charge (ex: payout/subscription) são ignorados em Sprint 1.
  // Retornamos 200 pra não disparar retry.
  if (!charge) {
    return NextResponse.json({ status: "ignored", event });
  }

  const idempotencyKey = `${event}:${charge.id}:${charge.updatedAt}`;
  const service = createSupabaseServiceClient();

  const { data: payment, error: lookupError } = await service
    .from("payments")
    .select("id, order_id, status, idempotency_key, raw_payload")
    .eq("provider_charge_id", charge.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[abacatepay-webhook] lookup payment:", lookupError.message);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!payment) {
    // Cobrança existe no AbacatePay mas não no nosso BD — possíveis causas:
    // teste manual no dashboard, BD restaurado de backup, race com place-order.
    // Retorna 200 pra não retry — mãe pode reconciliar manualmente se relevante.
    console.warn("[abacatepay-webhook] payment não encontrado para provider_charge_id:", charge.id);
    return NextResponse.json({ status: "not_tracked", chargeId: charge.id });
  }

  // Replay detection — webhook AbacatePay re-entrega em timeout/5xx.
  if (payment.idempotency_key === idempotencyKey) {
    return NextResponse.json({ status: "replay", chargeId: charge.id });
  }

  const nextStatus = mapPixStatusToPaymentStatus(charge.status);

  const previousPayload =
    payment.raw_payload && typeof payment.raw_payload === "object"
      ? (payment.raw_payload as Record<string, unknown>)
      : {};

  const paidAt = nextStatus === "paid" ? charge.updatedAt || new Date().toISOString() : null;

  const { error: updateError } = await service
    .from("payments")
    .update({
      status: nextStatus,
      paid_at: paidAt,
      idempotency_key: idempotencyKey,
      raw_payload: {
        ...previousPayload,
        lastEvent: event,
        status: charge.status,
        updatedAt: charge.updatedAt,
        paidAmount: charge.paidAmount,
      },
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("[abacatepay-webhook] update payment:", updateError.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Order.payment_status reflete o estado consolidado pra UI/admin.
  let nextOrderPaymentStatus: "PENDENTE" | "PAGO" | "ESTORNADO" | null = null;
  if (nextStatus === "paid") nextOrderPaymentStatus = "PAGO";
  else if (nextStatus === "refunded") nextOrderPaymentStatus = "ESTORNADO";

  if (nextOrderPaymentStatus) {
    const { data: orderRow, error: orderError } = await service
      .from("orders")
      .update({ payment_status: nextOrderPaymentStatus })
      .eq("id", payment.order_id)
      .select("total_cents, customer_phone, purchase_event_id, fbp, fbc")
      .maybeSingle();

    if (orderError) {
      console.error("[abacatepay-webhook] update order:", orderError.message);
      // Payment já gravou. Admin reconcilia order manualmente se necessário.
    }

    // Purchase via Conversions API (Etapa 5) — só no PAGO. Server-side é a
    // fonte confiável (sobrevive a ad-block/iOS). Dedup por purchase_event_id.
    // Falha aqui nunca derruba o webhook (pagamento já está gravado).
    if (nextStatus === "paid" && orderRow) {
      try {
        const capi = await sendPurchaseToMeta({
          eventId: orderRow.purchase_event_id,
          value: orderRow.total_cents / 100,
          orderId: payment.order_id,
          eventTimeSeconds: paidAt ? Math.floor(new Date(paidAt).getTime() / 1000) : undefined,
          phone: orderRow.customer_phone,
          fbp: orderRow.fbp,
          fbc: orderRow.fbc,
        });
        if (!capi.ok && capi.error !== "meta_capi_not_configured") {
          console.error("[abacatepay-webhook] CAPI Purchase:", capi.error);
        }
      } catch (err) {
        console.error(
          "[abacatepay-webhook] CAPI Purchase exception:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return NextResponse.json({
    status: "applied",
    event,
    chargeId: charge.id,
    paymentStatus: nextStatus,
  });
}

function verifySignature(rawBody: string, headerSignature: string, secret: string): boolean {
  const buf = Buffer.from(rawBody, "utf8");
  const base64 = createHmac("sha256", secret).update(buf).digest("base64");
  if (timingSafeStringEq(base64, headerSignature)) return true;

  // Alguns gateways enviam HMAC em hex em vez de base64. Cobrimos os dois.
  const hex = createHmac("sha256", secret).update(buf).digest("hex");
  return timingSafeStringEq(hex, headerSignature);
}

function signaturePreview(rawBody: string, secret: string): string {
  return (
    "b64:" +
    createHmac("sha256", secret)
      .update(Buffer.from(rawBody, "utf8"))
      .digest("base64")
      .slice(0, 16) +
    "… hex:" +
    createHmac("sha256", secret).update(Buffer.from(rawBody, "utf8")).digest("hex").slice(0, 16) +
    "…"
  );
}

function timingSafeStringEq(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
