import "server-only";

/**
 * Cliente AbacatePay v2 via fetch direto (ADR 0009).
 *
 * Por que NÃO o SDK oficial (`abacatepay-nodejs-sdk@1.6.0`):
 *  - SDK chama `/v1/pixQrCode/create` — endpoint deprecated. API atual
 *    rejeita com `401 "API key version mismatch"`. SDK 6 meses sem release.
 *  - API atual (v2): `POST /v2/transparents/create` com body envelopado
 *    em `{ method: "PIX", data: {...} }` e resposta `{success, data, error}`.
 *  - Status check: `GET /v2/transparents/check?id=<id>`.
 *
 * Este wrapper isola a fronteira HTTP — caller usa `createPixCharge` /
 * `checkPixCharge` e recebe shape estável (`PixQrCharge`).
 *
 * Server-only. Chave nunca chega ao bundle do cliente.
 */

const BASE_URL = "https://api.abacatepay.com/v2";

export const PIX_EXPIRES_IN_SECONDS = 60 * 60; // 1h — ADR 0009 D12 default.

/**
 * Chave pública AbacatePay usada pra verificar `X-Webhook-Signature` (HMAC-SHA256).
 * É constante pra todos os clientes da plataforma — defesa primária contra
 * forgery vem do `?webhookSecret=` query param (validado contra
 * `ABACATEPAY_WEBHOOK_SECRET` no env). HMAC garante integridade do body
 * em trânsito; query secret garante autenticidade do remetente.
 *
 * Fonte: https://docs.abacatepay.com/pages/webhooks/security.md
 */
export const ABACATEPAY_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

/**
 * CPF de teste **só pra health check** (`scripts/abacatepay-health.ts`).
 * Nunca é injetado em pedido real — `place-order.ts` valida CPF do profile
 * antes de chegar aqui e bloqueia checkout se vazio.
 *
 * `11144477735` é sintaticamente válido (passa algoritmo dos dígitos
 * verificadores), amplamente usado em documentação e sandbox de gateways.
 */
export const HEALTH_CHECK_PLACEHOLDER_CPF = "11144477735";

export type PixQrCharge = {
  id: string;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  amountCents: number;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  devMode: boolean;
};

export type PixCreateInput = {
  amountCents: number;
  description: string;
  customer: {
    name: string;
    email: string;
    cellphone?: string;
    /** CPF do pagador (obrigatório AbacatePay v2). Caller valida antes. */
    taxId: string;
  };
  expiresInSeconds?: number;
  /** Repassado pro AbacatePay e ecoado em webhook — útil pra reconciliação. */
  metadata?: Record<string, unknown>;
};

type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

function getApiKey(): string {
  const k = process.env.ABACATEPAY_API_KEY;
  if (!k) throw new Error("Missing ABACATEPAY_API_KEY environment variable.");
  return k;
}

async function abacateFetch<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    let body: ApiEnvelope<T> | null = null;
    try {
      body = (await res.json()) as ApiEnvelope<T>;
    } catch {
      return { ok: false, error: `HTTP ${res.status} sem corpo JSON.` };
    }

    if (!res.ok || !body || body.success === false) {
      const msg = body && body.success === false ? body.error : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    return { ok: true, data: body.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha de rede no AbacatePay.",
    };
  }
}

type CreateResponse = {
  id: string;
  amount: number;
  status: PixQrCharge["status"];
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
};

/**
 * Cria QR PIX dinâmico via AbacatePay v2 (transparente — ADR 0009 D1).
 */
export async function createPixCharge(
  input: PixCreateInput,
): Promise<{ ok: true; charge: PixQrCharge } | { ok: false; error: string }> {
  const result = await abacateFetch<CreateResponse>("/transparents/create", {
    method: "POST",
    body: JSON.stringify({
      method: "PIX",
      data: {
        amount: input.amountCents,
        expiresIn: input.expiresInSeconds ?? PIX_EXPIRES_IN_SECONDS,
        description: input.description,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          cellphone: input.customer.cellphone,
          taxId: input.customer.taxId,
        },
        metadata: input.metadata,
      },
    }),
  });

  if (!result.ok) return result;
  return { ok: true, charge: toPixQrCharge(result.data) };
}

type CheckResponse = {
  id: string;
  status: PixQrCharge["status"];
  expiresAt: string;
};

/**
 * Verifica status atual da cobrança (polling fallback ao webhook).
 * Retorna shape `PixQrCharge` mas com brCode/brCodeBase64 vazios — endpoint
 * `/check` é light (só id+status+expiresAt). Caller que precisa do QR deve
 * usar o que foi salvo em `payments.raw_payload` no momento da criação.
 */
export async function checkPixCharge(
  id: string,
): Promise<{ ok: true; charge: PixQrCharge } | { ok: false; error: string }> {
  const result = await abacateFetch<CheckResponse>(
    `/transparents/check?id=${encodeURIComponent(id)}`,
    { method: "GET" },
  );

  if (!result.ok) return result;
  return {
    ok: true,
    charge: {
      id: result.data.id,
      status: result.data.status,
      amountCents: 0,
      brCode: "",
      brCodeBase64: "",
      expiresAt: result.data.expiresAt,
      devMode: false,
    },
  };
}

function toPixQrCharge(data: CreateResponse): PixQrCharge {
  return {
    id: data.id,
    status: data.status,
    amountCents: data.amount,
    brCode: data.brCode,
    brCodeBase64: data.brCodeBase64,
    expiresAt: data.expiresAt,
    devMode: data.devMode,
  };
}

/**
 * Mapeia status PIX → status interno de `payments.status`.
 * Tabela `payments` aceita: pending | paid | failed | refunded.
 */
export function mapPixStatusToPaymentStatus(
  status: PixQrCharge["status"],
): "pending" | "paid" | "failed" | "refunded" {
  switch (status) {
    case "PAID":
      return "paid";
    case "REFUNDED":
      return "refunded";
    case "EXPIRED":
    case "CANCELLED":
      return "failed";
    case "PENDING":
    default:
      return "pending";
  }
}
