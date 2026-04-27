# AbacatePay — Go-live checklist

Passos pra subir integração pra produção. Sem teoria, só comandos.

Pré-requisitos: dev local funcionando 100% (`npm run abacatepay:health` verde + webhook gravando idempotency_key).

---

## 1. Conta AbacatePay produção

- [ ] Dashboard AbacatePay → Configurações → **completar cadastro empresa** (CNPJ ou MEI Veg.ana, dados bancários reais).
- [ ] Aprovação KYC AbacatePay (pode demorar 1-3 dias úteis).
- [ ] Sair do **Dev Mode** (toggle topo dashboard).
- [ ] Gerar **chave API prod** (formato `abc_prod_*`). Copiar.
- [ ] Gerar **webhook secret prod** novo (não reusar dev):
  ```bash
  node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
  ```

---

## 2. Domínio

- [ ] Comprar domínio (`veg.ana.com.br` ou similar).
- [ ] Apontar DNS para Vercel (`A` ou `CNAME` conforme instruções Vercel).
- [ ] Aguardar propagação (até 24h).

Se for usar subdomínio Vercel temporário (`vegana.vercel.app`) pra primeiro teste, OK.

---

## 3. Vercel project

- [ ] Criar projeto Vercel apontando pro repo Git do Veg.ana.
- [ ] Project Settings → **Environment Variables** → adicionar (escopo: **Production**):

  ```
  NEXT_PUBLIC_SUPABASE_URL=<do Supabase project>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<idem>
  SUPABASE_SERVICE_ROLE_KEY=<idem — server only>

  ABACATEPAY_API_KEY=abc_prod_xxx
  ABACATEPAY_WEBHOOK_SECRET=<secret prod gerado em §1>
  ABACATEPAY_ENV=prod

  WHATSAPP_TOKEN=<quando WhatsApp Cloud API entrar>
  WHATSAPP_PHONE_NUMBER_ID=<idem>

  NEXT_PUBLIC_POSTHOG_KEY=<quando PostHog entrar>
  NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
  ```

- [ ] **NÃO setar** `ABACATEPAY_WEBHOOK_DEBUG` em prod (vaza HMAC nos logs).
- [ ] **NUNCA** colar chave dev (`abc_dev_*`) em scope Production.

---

## 4. Deploy inicial

- [ ] Push pra branch `main`.
- [ ] Vercel build roda automático.
- [ ] Confirmar build verde (`Deployments` → último item).
- [ ] Acessar `https://veg.ana.com.br/` → cardápio carrega.

---

## 5. Webhook produção no dashboard AbacatePay

- [ ] Dashboard → **Webhooks** → **Criar webhook**:
  - **Versão:** v2
  - **Nome:** `Vegana - Produção`
  - **URL:**
    ```
    https://veg.ana.com.br/api/webhooks/abacatepay
    ```
    (sem trailing slash, sem `?webhookSecret=...`, sem typo no `abacatepay`).
  - **Secret:** valor de `ABACATEPAY_WEBHOOK_SECRET` no Vercel.
  - **Eventos:** marcar `transparent.completed`, `transparent.refunded`, `transparent.disputed`.
  - Salvar.

---

## 6. Smoke test prod (R$ 1 real)

- [ ] Mãe (ou Pedro) cria pedido de R$ 1 no `https://veg.ana.com.br/carrinho`.
- [ ] Tela `/obrigado/<id>` mostra QR.
- [ ] Mãe paga R$ 1 via app do banco no celular dela.
- [ ] Em ≤ 8s painel vira verde "Pagamento confirmado".
- [ ] Confere BD via Supabase Studio:
  ```sql
  select status, paid_at, idempotency_key
  from payments
  order by created_at desc limit 1;
  ```
  Esperado: `paid` + `paid_at` preenchido + `idempotency_key` começando com `transparent.completed:`.
- [ ] Confere `orders.payment_status = 'PAGO'`.
- [ ] Confere AbacatePay dashboard → Saldo aumenta R$ 0,98 (R$ 1 menos taxa).

Se passar tudo: **prod operacional**. Cancela esse pedido manualmente no kanban (não é venda real).

---

## 7. Itens bloqueantes pra venda real

Não vende um centavo de cliente real até resolver:

- [ ] **Coleta de CPF obrigatória** — hoje cai pro placeholder `11144477735` se vazio. Em prod, AbacatePay pode rastrear taxId pra antifraude. Solução: tornar CPF obrigatório no `/conta` antes de fechar pedido.
- [ ] **Address store** — atualmente mock hardcoded em `address-store.ts`. Endereço cadastrado em `/conta` não chega no checkout. Cliente real não consegue avançar.
- [ ] **Brand voice** — passar todas strings novas (painel PIX, banner fallback) pelo `brand-voice-keeper`.
- [ ] **WhatsApp Cloud API** ativo — mãe precisa receber notificação automática de pedido novo. Se ainda manual, ela tem que olhar kanban toda hora.

---

## 8. Monitoramento primeiras semanas

- [ ] Diariamente: dashboard AbacatePay → Webhooks → Logs. Tudo `Sucesso`?
- [ ] Diariamente: Supabase → tabela `payments` → procurar `provider='manual'` (fallback ativou — gateway falhou).
- [ ] Semanalmente: comparar saldo AbacatePay com `select sum(total_cents) from orders where payment_status='PAGO' and created_at > '<data>'`.
- [ ] Investigar qualquer pedido que ficou `pending` > 1h sem auto-cancel (ADR D12 manual).

---

## 9. Rollback plan

Se algo quebrar em prod:

1. **Suspende AbacatePay:** dashboard → desativa webhook + revoga chave prod.
2. **Site continua aceitando pedidos** mas todos caem em fallback `provider='manual'` (ADR 0009 D6) com banner "Veg.ana vai te chamar no WhatsApp".
3. Mãe combina pagamento com cada cliente direto.
4. Sem prejuízo de dados — pedidos ficam no BD intactos.

Reversibilidade total em < 5 min.

---

## 10. Atalhos operacionais

| Comando | Quando |
|---|---|
| `npm run abacatepay:health` | Diagnóstico dev local — usa em qualquer dúvida |
| `npm run abacatepay:simulate -- pix_char_xxx` | Forçar pagamento em dev (não funciona em prod, é Dev Mode only) |
| Dashboard → Webhook Logs → Reenviar | Webhook falhou e quer tentar de novo |
| Supabase Studio SQL Editor | Inspecionar `payments`, `orders`, `idempotency_key` |

---

## 11. Próximas iterações

Não bloqueiam go-live mas sobem qualidade operacional:

- **Named tunnel Cloudflare em dev** — URL fixa, não atualiza dashboard a cada restart.
- **Auto-cancel PIX expirado** (ADR D12, Open Q6) — Supabase Edge Function ou Vercel Cron de 15min.
- **Cartão de crédito** (ADR D1, billing.create + redirect hospedado).
- **Refund automatizado** (ADR D7, Open Q2) — botão "estornar" no kanban.
- **Boleto** — descartado por design (ADR D8). Só revisitar se Veg.ana lançar produto não-perecível.
