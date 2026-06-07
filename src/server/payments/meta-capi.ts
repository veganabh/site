import "server-only";

import { createHash } from "node:crypto";

/**
 * Conversions API da Meta (Etapa 5) — envia `Purchase` server-side a partir do
 * webhook AbacatePay (status pago = fonte da verdade). Sobrevive a ad-block/iOS
 * que derruba ~30% dos eventos do browser.
 *
 * Dedup: usa `event_id` = `orders.purchase_event_id`. Se o browser também
 * disparar Purchase com o mesmo id, a Meta deduplica.
 *
 * Segurança (§8 CLAUDE.md): PII (telefone) é SHA-256 antes de sair. Nada de PII
 * em log. Token só server (`META_CAPI_ACCESS_TOKEN`).
 */

const GRAPH_VERSION = "v21.0";
const DEFAULT_SOURCE_URL = "https://veganabh.com.br";

type PurchaseInput = {
  /** orders.purchase_event_id — dedup browser × server. */
  eventId: string;
  /** Valor do pedido em reais. */
  value: number;
  currency?: string;
  orderId: string;
  /** Epoch em segundos do pagamento (default: agora). */
  eventTimeSeconds?: number;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  eventSourceUrl?: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Dígitos + DDI 55 (Brasil) sem duplicar. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendPurchaseToMeta(
  input: PurchaseInput,
): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return { ok: false, error: "meta_capi_not_configured" };

  const userData: Record<string, unknown> = {};
  if (input.phone) {
    const phone = normalizePhone(input.phone);
    if (phone) userData.ph = [sha256(phone)];
  }
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: input.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: input.eventSourceUrl ?? DEFAULT_SOURCE_URL,
    user_data: userData,
    custom_data: {
      currency: input.currency ?? "BRL",
      value: Number(input.value.toFixed(2)),
      order_id: input.orderId,
    },
  };

  const body: Record<string, unknown> = { data: [event] };
  const testCode = process.env.META_TEST_EVENT_CODE;
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network_error" };
  }
}
