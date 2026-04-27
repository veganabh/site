/**
 * Smoke test pra simular pagamento PIX no AbacatePay Dev Mode (API v2).
 *
 * Uso:
 *   npm run abacatepay:simulate -- <provider_charge_id>
 *   # ou:
 *   node --env-file=.env.local --import tsx scripts/simulate-pix-payment.ts <id>
 *
 * Onde `<provider_charge_id>` é o `pix_char_xxx` salvo em
 * `payments.provider_charge_id` após o checkout.
 *
 * Endpoint usado: `POST /v2/transparents/simulate-payment?id=<id>` — só
 * funciona em chave dev (Dev Mode).
 *
 * Pós-execução:
 *  - AbacatePay marca cobrança PAID.
 *  - Polling em /obrigado captura na próxima iteração (≤4s).
 *  - UI muda pra "Pagamento confirmado" + router.refresh recarrega resumo.
 */

const id = process.argv[2];
if (!id) {
  console.error("Uso: npm run abacatepay:simulate -- <provider_charge_id>");
  process.exit(1);
}

const apiKey = process.env.ABACATEPAY_API_KEY;
if (!apiKey) {
  console.error("ABACATEPAY_API_KEY ausente em .env.local.");
  process.exit(1);
}

(async () => {
  const res = await fetch(
    `https://api.abacatepay.com/v2/transparents/simulate-payment?id=${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );

  const body = (await res.json()) as
    | { success: true; data: { id: string; amount: number; status: string } }
    | { success: false; error: string };

  if (!res.ok || !("success" in body) || body.success === false) {
    const err = "error" in body && typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
    console.error("Erro:", err);
    process.exit(1);
  }

  console.log("PIX simulado. Status:", body.data.status);
  console.log("ID:", body.data.id, "| amount:", body.data.amount / 100, "BRL");
})();
