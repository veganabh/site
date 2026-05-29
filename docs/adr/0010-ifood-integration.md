# ADR 0010 — Integração com a API oficial do iFood

**Status:** Proposto (documentação — implementação faseada pós-launch do site)
**Data:** 2026-05-29
**Autor:** vegana-bh-lead + site-architect
**Depende de:** ADR 0005 (máquina de estado de pedidos), ADR 0008 (schema), ADR 0009 (pagamento)

---

## 1. Contexto

Pedro tem acesso de **desenvolvedor iFood** (conta conectada ao iFood da mãe — a loja deste
projeto). Hoje o perfil é **"Pessoal/Estudante"** → só ambiente de **teste/sandbox**. A integração
oficial permitiria unificar pedidos, cardápio, avaliações e financeiro entre iFood e o sistema
próprio — alinhado ao objetivo central do negócio (reduzir dependência do iFood **com dados na
mão**, não às cegas).

### App de teste disponível
- App **Centralizado** (`pedro-berg - Teste (C)`) — modelo correto pra loja única (Vegana).
- Auth: **Client Credentials** (`clientId` + `clientSecret` → token OAuth).
- Merchant sandbox: `3020568` / UUID `1912c507-a49b-4731-b0ef-c17f979fa779` (CNPJ fake).
- "Gerar pedido de teste" cria pedidos fake → exercita o fluxo Order.
- **Webhook = Desativado** → começar por **Events (polling)**.

### Módulos autorizados (sandbox)
Order · Events · Catalog · Financial · Review · Merchant · Shipping (iFood Entrega) · Logistics ·
Item · Picking · Groceries · Promotion. (Os 5 últimos são de mercado/integrador — fora do escopo
confeitaria.)

---

## 2. Restrição-chave: produção exige homologação

O perfil Estudante **não homologa pra produção**. Caminho pra produção:
1. **Subir perfil** Estudante → Empresa/Parceiro (exige CNPJ da confeitaria).
2. **Homologação** por módulo — passar cenários de teste validados pelo iFood (Order é o pesado:
   ciclo completo do pedido sem erro).
3. **Solicitar permissões** em produção.
4. **Vincular a loja real** (mãe autoriza o app).

**Timeline:** semanas + dependência do prazo do iFood (não 100% sob nosso controle).

**Decisão de produto:** a integração iFood **NÃO bloqueia** o launch do site (canal próprio já
funciona com AbacatePay). É workstream paralelo. Lança o site primeiro; homologa o iFood depois.

---

## 3. Decisões técnicas

### D1 — Auth: Client Credentials com cache de token
- `IFOOD_CLIENT_ID` + `IFOOD_CLIENT_SECRET` em env server-only (nunca `NEXT_PUBLIC`, nunca git).
- Token via `POST /authentication/v1.0/oauth/token` (grant_type=client_credentials).
- Cachear o token (expira ~3h) em memória/Supabase; renovar antes de expirar.
- `IFOOD_ENV` (`sandbox` | `prod`) seleciona base URL + credenciais — espelha o padrão do AbacatePay (ADR 0009 D3).

### D2 — Ingestão de pedido: Events polling primeiro, webhook depois
- **Polling** (`GET /events/v1.0/events:polling`) a cada ~30s + `POST .../acknowledgment` pra
  confirmar recebimento. Não precisa URL pública → funciona no sandbox e em dev local.
- Quando webhook for ativado em produção: `POST /api/webhooks/ifood` com validação de assinatura
  (espelha o handler AbacatePay — ADR 0009 D4). Polling vira fallback.
- **Idempotência:** cada evento iFood tem ID único → tabela `ifood_events` com `event_id UNIQUE`;
  reprocessamento ignora duplicado (mesma estratégia de `payments.idempotency_key`).

### D3 — Mapeamento pedido iFood → schema próprio
- iFood order → `orders` com `source = 'ifood'` (já existe na máquina de estado, ADR 0005/0008).
- Guardar `ifood_order_id` + `raw_payload jsonb` numa coluna/tabela de vínculo (`ifood_orders`).
- Status iFood (PLACED/CONFIRMED/DISPATCHED/CONCLUDED/CANCELLED) → mapeado pro nosso
  (NOVO/PREPARANDO/PRONTO/A_CAMINHO/ENTREGUE/CANCELADO).
- Itens → `order_items` (snapshot). Cliente iFood: sem profile_id (igual convidado) — usa
  `customer_name`/`customer_phone` do payload.
- **Realtime existente** (Migration 25) propaga o pedido iFood ao kanban automaticamente ao inserir.

### D4 — Confirmação de status bidirecional
- Mudar status no nosso kanban (aceitar/pronto/despachar) → chamar Order API pra refletir no iFood
  (`POST /orders/{id}/confirm`, `/dispatch`, etc).
- Cuidado: evitar loop (mudança via webhook → não re-disparar pro iFood). Flag de origem por update.

### D5 — Review (social proof) — fase de menor risco
- `GET /review/v1.0/merchants/{id}/reviews` → puxa avaliações + notas reais (equity 4.8-4.9).
- Cachear no Supabase (`ifood_reviews`) + exibir no site (componente de social proof).
- Read-mostly → homologação leve. **Bom primeiro módulo a homologar.**

### D6 — Financial → relatório de canais real
- `Financial` API → receita/repasse iFood real alimenta o relatório "Canais" (já construído em
  `/gestao/relatorios`), substituindo o dado só-site por dado consolidado.

### D7 — Catalog (cardápio único) — fase posterior
- `Catalog` API → empurra produtos/preços do nosso painel pro iFood (evita manutenção dupla).
- Mapeamento `products` ↔ catálogo iFood. Maior risco de divergência → fase madura.

### D8 — Shipping (iFood Entrega) — alavanca de entrega própria
- `Shipping` permite pedir **entregador iFood pra pedido captado fora da plataforma** (= pedido do
  nosso site). Resolve logística de entrega própria usando a malha iFood. Avaliar custo por entrega.

---

## 4. Fases (ordem por valor × risco de homologação)

| Fase | Entrega | Módulos | Risco homolog. |
|------|---------|---------|----------------|
| **F1** | Avaliações iFood no site (social proof) | Review | Baixo (leitura) |
| **F2** | Ingestão de pedido iFood no kanban + canal real | Order + Events | Alto (ciclo completo) |
| **F3** | Receita iFood real nos relatórios | Financial | Médio |
| **F4** | Cardápio único (push pro iFood) | Catalog | Médio-alto |
| **F5** | Entrega própria via iFood Entrega | Shipping | Médio |

Construir/validar cada fase contra o **sandbox** antes da homologação. F1 (Review) é o melhor
ponto de entrada — valor alto (social proof premium), homologação leve.

---

## 5. Schema previsto (migrations futuras)

- `ifood_orders` (id, ifood_order_id UNIQUE, order_id FK → orders, status, raw_payload jsonb, ...).
- `ifood_events` (event_id UNIQUE, type, payload, processed_at) — idempotência do polling/webhook.
- `ifood_reviews` (id, ifood_review_id UNIQUE, rating, comment, customer_name, created_at).
- `products.ifood_item_id` (vínculo de catálogo — fase F4).
- Token cache: tabela `ifood_tokens` ou cache em memória (decidir na implementação).

---

## 6. Segurança

- `clientSecret` + token = **server-only**, nunca expostos ao cliente, nunca commitados.
- Webhook (quando ativo) valida assinatura antes de processar (igual AbacatePay).
- Idempotência obrigatória (eventos reentregues).
- Rate limit do polling respeitado (~30s).

---

## 7. Pré-requisitos pra produção (ação fora do código)

1. CNPJ da confeitaria + upgrade do perfil iFood (Estudante → Parceiro).
2. Homologação do(s) módulo(s) escolhido(s) no portal iFood.
3. Vínculo + autorização da loja real da mãe.
4. Credenciais de produção + `IFOOD_ENV=prod`.

---

## 8. Consequências

### Positivas
- Visão **multi-canal unificada** (site + iFood num painel) — eleva o produto a nível vendável.
- Relatório de canais com **dado real** de ambos os lados.
- Social proof real (avaliações iFood) no site.
- Entrega própria viável via malha iFood.

### Custos / riscos
- Homologação = lead time + dependência do iFood.
- Manutenção de mapeamento de status/catálogo (divergência possível).
- Não bloqueia launch — mas é esforço de engenharia real, faseado.

---

## 9. Decisão

**Documentar agora (este ADR). Implementar pós-launch do site, em paralelo, começando por F1
(Review) contra o sandbox.** O launch do canal próprio (site + AbacatePay) segue independente e
prioritário.
