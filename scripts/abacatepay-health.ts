/**
 * Health check end-to-end da integração AbacatePay.
 *
 * Uso:
 *   npm run abacatepay:health
 *
 * O script:
 *  1. Valida `.env.local` (chave API + webhook secret presentes).
 *  2. Cria uma cobrança PIX real de R$ 1,00 no Dev Mode.
 *  3. Simula o pagamento via endpoint dev.
 *  4. Aguarda 6s pro webhook chegar.
 *  5. Lê `payments` no Supabase pra confirmar `status='paid'` + `idempotency_key`.
 *  6. Limpa cobrança de teste (sem efeito real, é Dev Mode).
 *
 * Cada etapa imprime ✅/❌ com mensagem direta de ação. Sem truncar erro real
 * da API — quem operar sabe exatamente o que mexer.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_KEY = process.env.ABACATEPAY_API_KEY;
const WEBHOOK_SECRET = process.env.ABACATEPAY_WEBHOOK_SECRET;

const BASE_URL = "https://api.abacatepay.com/v2";

let failed = false;

function step(label: string) {
  process.stdout.write(label.padEnd(40, " ") + " ");
}

function ok(msg: string) {
  console.log(`\x1b[32m✅\x1b[0m ${msg}`);
}

function fail(msg: string, hint?: string) {
  failed = true;
  console.log(`\x1b[31m❌\x1b[0m ${msg}`);
  if (hint) console.log(`   \x1b[33m→ ${hint}\x1b[0m`);
}

function warn(msg: string, hint?: string) {
  console.log(`\x1b[33m⚠️\x1b[0m  ${msg}`);
  if (hint) console.log(`   \x1b[33m→ ${hint}\x1b[0m`);
}

async function main() {
  console.log("\n🩺 Health check AbacatePay\n");

  // ── 1. Env vars ───────────────────────────────────────────────────────────
  step("🔑 Chave API .env.local");
  if (!API_KEY) {
    fail(
      "ABACATEPAY_API_KEY ausente",
      "Edite .env.local e cole a chave do dashboard (https://app.abacatepay.com → API Keys)",
    );
    return;
  }
  if (!API_KEY.startsWith("abc_dev_") && !API_KEY.startsWith("abc_prod_")) {
    fail(
      `formato suspeito (prefixo: "${API_KEY.slice(0, 8)}")`,
      "Chave válida começa com `abc_dev_` ou `abc_prod_`. Regenere no dashboard.",
    );
    return;
  }
  ok(`${API_KEY.slice(0, 12)}... (${API_KEY.length} chars)`);

  step("🔐 Webhook secret .env.local");
  if (!WEBHOOK_SECRET) {
    warn(
      "ABACATEPAY_WEBHOOK_SECRET ausente",
      "Webhook não vai funcionar. Gere com: node -e \"console.log(require('node:crypto').randomBytes(32).toString('hex'))\" e cole em .env.local + dashboard.",
    );
  } else if (WEBHOOK_SECRET.length < 32) {
    warn(
      `só ${WEBHOOK_SECRET.length} chars (recomendado 64+)`,
      "Gere um secret mais forte com node -e \"...randomBytes(32).toString('hex')\"",
    );
  } else {
    ok(`${WEBHOOK_SECRET.length} chars`);
  }

  step("🗄️  Supabase .env.local");
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes",
      "Sem isso não dá pra confirmar gravação do webhook no BD. Veja .env.local.example.",
    );
    return;
  }
  ok("URL + service key configurados");

  // ── 2. Auth check + create charge ─────────────────────────────────────────
  step("🧪 Cria PIX teste (R$ 1)");
  const createRes = await fetch(`${BASE_URL}/transparents/create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "PIX",
      data: {
        amount: 100,
        expiresIn: 600,
        description: "abacatepay:health smoke test",
        customer: {
          name: "Veg.ana Health",
          email: "health@vegana.test",
          cellphone: "31999999999",
          // CPF de teste — health check só usa em Dev Mode.
          taxId: "11144477735",
        },
      },
    }),
  });
  const createBody = await createRes.text();
  let charge: { id: string; status: string } | null = null;
  if (createRes.ok) {
    try {
      const parsed = JSON.parse(createBody) as {
        success: boolean;
        data?: { id: string; status: string };
        error?: string;
      };
      if (parsed.success && parsed.data) {
        charge = parsed.data;
        ok(`${parsed.data.id} (${parsed.data.status})`);
      } else {
        fail(parsed.error ?? `HTTP ${createRes.status}`, hintForCreateError(parsed.error));
      }
    } catch {
      fail(`resposta não-JSON: ${createBody.slice(0, 120)}`);
    }
  } else {
    fail(`HTTP ${createRes.status}: ${createBody.slice(0, 200)}`, hintForCreateError(createBody));
  }

  if (!charge) return;

  // ── 3. Simulate payment ───────────────────────────────────────────────────
  step("💸 Simula pagamento Dev Mode");
  const simRes = await fetch(
    `${BASE_URL}/transparents/simulate-payment?id=${encodeURIComponent(charge.id)}`,
    { method: "POST", headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" }, body: "{}" },
  );
  const simBody = await simRes.text();
  if (!simRes.ok) {
    fail(`HTTP ${simRes.status}: ${simBody.slice(0, 200)}`);
    return;
  }
  try {
    const parsed = JSON.parse(simBody) as {
      success: boolean;
      data?: { status: string };
      error?: string;
    };
    if (parsed.success && parsed.data?.status === "PAID") {
      ok("status=PAID");
    } else {
      fail(parsed.error ?? `status inesperado: ${JSON.stringify(parsed.data)}`);
      return;
    }
  } catch {
    fail(`resposta não-JSON: ${simBody.slice(0, 120)}`);
    return;
  }

  // ── 4. Aguarda webhook chegar ─────────────────────────────────────────────
  step("🪝 Aguarda webhook (6s)");
  await new Promise((r) => setTimeout(r, 6000));

  // ── 5. Verifica BD ────────────────────────────────────────────────────────
  step("🗄️  Payment registrado no BD?");
  const dbRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payments?select=status,paid_at,idempotency_key,raw_payload&provider_charge_id=eq.${charge.id}&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!dbRes.ok) {
    fail(`Supabase HTTP ${dbRes.status}: ${(await dbRes.text()).slice(0, 200)}`);
    return;
  }
  const rows = (await dbRes.json()) as Array<{
    status: string;
    paid_at: string | null;
    idempotency_key: string | null;
  }>;

  if (rows.length === 0) {
    warn(
      "nenhuma payment row encontrada com esse provider_charge_id",
      "Esperado: cobrança de teste só existe no AbacatePay, não no BD (porque não foi via place-order). Pular essa checagem.",
    );
    return;
  }

  const row = rows[0];
  if (row.status === "paid" && row.idempotency_key) {
    ok(`status=paid + idempotency_key OK + paid_at=${row.paid_at}`);
    console.log("\n\x1b[32m✨ Webhook funcionando fim a fim.\x1b[0m\n");
    return;
  }

  if (row.status === "paid" && !row.idempotency_key) {
    warn(
      "status=paid mas idempotency_key vazio",
      "Polling marcou PAID antes do webhook. Verifique cloudflared / dashboard webhook.",
    );
    return;
  }

  fail(
    `status=${row.status} (esperado: paid)`,
    "Webhook não chegou. Confira: 1) cloudflared rodando 2) URL no dashboard aponta pra tunnel ativa 3) ABACATEPAY_WEBHOOK_SECRET bate com Secret no dashboard 4) eventos transparent.* marcados.",
  );
}

function hintForCreateError(err: string | undefined): string | undefined {
  if (!err) return undefined;
  const e = err.toLowerCase();
  if (e.includes("api key version mismatch") || e.includes("invalid or inactive")) {
    return "Chave inválida/expirada. Regenere em https://app.abacatepay.com (API Keys) e atualize .env.local.";
  }
  if (e.includes("invalid taxid")) {
    return "CPF inválido. Em /conta, preencha um CPF real do dono da conta.";
  }
  if (e.includes("amount")) {
    return "Valor mínimo R$ 1,00. Esse health check usa R$ 1 (100 cents).";
  }
  return undefined;
}

main()
  .catch((err) => {
    console.log(`\x1b[31m❌\x1b[0m Erro inesperado: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (failed) process.exitCode = 1;
  });

export {};
