# AbacatePay — Setup

Guia operacional pra configurar AbacatePay (gateway PIX) no site Veg.ana.

Especificação técnica completa: [`docs/adr/0009-abacatepay-integration.md`](./adr/0009-abacatepay-integration.md).

---

## 1. Conta + chave dev

1. Criar conta em https://app.abacatepay.com/ (email operacional Veg.ana).
2. Cadastrar loja com dados do MEI / CNPJ + dados bancários da Veg.ana.
3. Toggle **Dev Mode** no canto superior do dashboard. Confirmar badge "ambiente de teste".
4. Configurações → **API Keys** → Gerar nova chave dev (formato `abc_dev_...`, 32 chars).
5. Colar valor em `Site/app/.env.local`:
   ```
   ABACATEPAY_API_KEY=abc_dev_xxxxxxxxxxxx
   ABACATEPAY_ENV=dev
   ```

### Validar chave dev

```bash
cd Site/app
node --env-file=.env.local -e "
fetch('https://api.abacatepay.com/v2/transparents/create', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + process.env.ABACATEPAY_API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'PIX',
    data: {
      amount: 100, expiresIn: 600, description: 'teste',
      customer: { name: 'Teste', email: 'teste@example.com', cellphone: '11999999999', taxId: '11144477735' }
    }
  })
}).then(r => r.text().then(t => console.log(r.status, t.slice(0, 500))));
"
```

Esperado: `200 {"success":true,"data":{"id":"pix_char_...","brCode":"...","brCodeBase64":"data:image/png;base64,..."}}`.

Se retornar `401 "API key version mismatch"` ou `"Invalid or inactive"` → chave revogada. Volte ao passo 4.

---

## 2. Webhook

O site escuta `POST /api/webhooks/abacatepay?webhookSecret=<SEU_SECRET>`. Cada evento marca a payment row e atualiza `orders.payment_status`. ADR 0009 D4 detalha o fluxo de validação.

### Em dev local (com tunnel)

1. Subir tunnel pública apontando pra `localhost:3100`. Opções (qualquer uma serve):
   - **cloudflared:** `cloudflared tunnel --url http://localhost:3100`
   - **ngrok:** `ngrok http 3100`
   - URL retornada (ex: `https://abc-123.trycloudflare.com`).

2. Decidir um secret forte (32+ chars random):
   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Colar em `.env.local`:
   ```
   ABACATEPAY_WEBHOOK_SECRET=<valor_gerado>
   ```

4. Restart `npm run dev`.

5. No dashboard AbacatePay → **Webhooks** → Criar:
   - URL: `https://abc-123.trycloudflare.com/api/webhooks/abacatepay?webhookSecret=<valor_gerado>`
   - Eventos: marcar `transparent.completed`, `transparent.refunded`, `transparent.disputed`.

6. Teste:
   - Cria pedido em `/carrinho`.
   - Pega `provider_charge_id` em Supabase Studio (`select provider_charge_id from payments order by created_at desc limit 1`).
   - Simula pagamento:
     ```bash
     npm run abacatepay:simulate -- pix_char_xxx
     ```
   - Logs do `npm run dev` devem mostrar request `POST /api/webhooks/abacatepay`.
   - `select status from payments where provider_charge_id = 'pix_char_xxx'` → `paid`.
   - `select payment_status from orders where ...` → `PAGO`.

### Em produção

Mesma config, trocando:
- URL: `https://veg.ana/api/webhooks/abacatepay?webhookSecret=<valor>`.
- Secret: gerar novo (não reusar o de dev). Valor entra em variáveis de ambiente do Vercel (Settings → Environment Variables → Production).
- Chave API: gerar chave **prod** no dashboard (sem `dev` no prefixo). Trocar `ABACATEPAY_ENV=prod` no Vercel.
- Antes do go-live: smoke test com PIX real de R$ 1 feito pela mãe no celular dela (ADR 0009 D9).

---

## 3. Polling vs webhook

- **Webhook** = caminho canônico em prod. Atualiza BD assim que cliente paga, mesmo se aba fechou.
- **Polling** (`/api/payments/[orderId]/status` a cada 4s na página `/obrigado`) = fallback UX. Reage rápido na tela aberta. Se webhook chega antes, polling vê estado já atualizado e para.

Os dois caminhos convergem no mesmo update — `payments.idempotency_key` UNIQUE evita reprocesso quando ambos chegam.

---

## 4. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `[place-order] AbacatePay createPix: API key version mismatch` | Chave dev revogada/antiga | Regenerar chave no dashboard, atualizar `.env.local` |
| `[place-order] AbacatePay createPix: Invalid taxId` | CPF do cliente inválido | `/conta` → preencher CPF válido. Em dev, place-order cai pro placeholder `11144477735` |
| `[place-order] AbacatePay createPix: Value should be one of 'object', 'object'` | Payload customer ausente ou vazio | Garantir `name`/`email` preenchidos no profile |
| Webhook 401 `unauthorized` | `?webhookSecret=` errado ou ausente | Conferir URL do webhook no dashboard contém `?webhookSecret=<valor>` |
| Webhook 401 `invalid_signature` | Body alterado em trânsito ou secret divergente | Validar `ABACATEPAY_WEBHOOK_SECRET` do `.env.local` bate com o configurado no dashboard |
| Pedido fica em `pending` mesmo após pagar PIX simulado | Webhook não chegou (URL errada / tunnel caiu) | Conferir logs `npm run dev` por `POST /api/webhooks/abacatepay` |

---

## 5. Modo manual (fallback ADR 0009 D6)

Se AbacatePay estiver fora ou chave expirar, place-order salva pedido com `provider='manual'` e a página `/obrigado` mostra banner "pagamento pelo WhatsApp". Mãe combina pagamento direto com o cliente. Sem fricção pra usuário.
