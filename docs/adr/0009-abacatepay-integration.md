# ADR 0009 — Integração com AbacatePay (gateway de pagamento)

**Status:** Proposto (aguardando aprovação do Lead)
**Data:** 2026-04-23
**Autor:** `site-architect` (Opus)
**Supersede:** substitui qualquer menção anterior a Pagar.me nos ADRs.
**Depende de:** ADR 0001 (deps), ADR 0005 (máquina de estado), ADR 0008 (schema).

---

## 1. Contexto

Pedro decidiu trocar o gateway planejado (Pagar.me) por **AbacatePay** (`https://docs.abacatepay.com/`). Este ADR define **como o site integra com AbacatePay no Sprint 1** — não é um ADR de "qual gateway" (decisão já tomada pelo Lead, fora do escopo do arquiteto), é o **desenho técnico da integração**.

### Por que agora

- O ADR 0008 modela `payments` com `provider = 'abacatepay'` default — mas não desce ao nível de checkout hospedado vs transparente, webhook, métodos, fallbacks e timeouts.
- Sprint 1 incluirá "AbacatePay dev mode (PIX + cartão)" como gate de saída do modo mock.
- Integração de pagamento tem **custo altíssimo de reversão operacional** depois que o primeiro cliente real pagar. Desenhar hoje é cheap — resolver à queima-roupa depois é caro.

### Forças em jogo

- **Porte da confeitaria:** R$ 8–10k/mês, ~50–80 pedidos/mês esperados no site próprio inicial. Não dá pra super-engenheirar (fraude complexa, BI de pagamento, reconciliação automática Sprint 1). Dá pra engenheirar o básico sólido.
- **Confeitaria perecível D+1:** pedido de HOJE sai AMANHÃ. Qualquer método de pagamento com compensação >4h é inviável (elimina boleto).
- **Ticket médio baixo (R$ 44–49):** parcelamento de cartão tem valor marginal. Cliente que parcela R$ 49 em 3x paga R$ 16/mês — experiência boa pra ele, juros absorvidos pelo lojista não compensam se altos.
- **Premium sem fricção:** confeitaria se posiciona premium. Checkout com 2 redirects + 3 campos descolados quebra a percepção. Transparente no PIX é preferível se AbacatePay suportar bem.
- **Operadora = 1 pessoa (mãe do Pedro):** se AbacatePay cair, não podemos bloquear o pedido. Ela precisa ver "aguardando pagamento" no kanban e decidir se produz ou não.

### O que a doc AbacatePay confirma (coletado por Pedro)

- **Métodos:** PIX (QR Code dinâmico, verificação via endpoint), Cartão de Crédito (parcelamento até 12x), Boleto (com PIX alternativo embutido).
- **SDKs oficiais:** Node.js (npm), Python, Go, PHP, Java. TypeScript types, Zod schemas, Typebox disponíveis.
- **Autenticação:** API keys (formato Bearer token).
- **Webhooks:** eventos "pagamento aprovado" e "saque concluído". Assinatura HMAC. Endpoints CRUD de webhook via API.
- **Endpoints principais:** `/payment/create` (checkout hospedado) + transparent mode (QR Code e boleto renderizados sem redirect).
- **Ambientes:** Dev Mode (sandbox com simulação) + Production, separados explicitamente.
- **CLI oficial** com login/logout e múltiplos perfis.
- **ESLint plugin oficial** pra prevenção de leak de chaves.

---

## 2. Decisões

### D1 — Modelo de checkout **híbrido: transparente no PIX, hospedado no cartão**

- **PIX:** transparente. Chamamos `POST /payment/create` (ou equivalente do SDK) do **server**, recebemos QR Code (string + base64 image) + ID da charge, renderizamos o QR no nosso próprio `/checkout/pagamento` com countdown e copia-cola. Polling via endpoint `/billing/{id}` ou webhook de confirmação.
- **Cartão de crédito:** hospedado. Redireciona pro checkout do AbacatePay (ou iframe se oferecido) pra tokenização PCI-compliant. Volta pra `/checkout/obrigado?order=<uuid>` no retorno.

**Por quê:**

- **PIX transparente = premium sem fricção.** O momento "QR aparece na tela" é UX sensível. Sair da Veg.ana pra uma URL `pay.abacatepay.com` quebra o posicionamento. Transparente mantém marca, tipografia, tom.
- **Cartão hospedado = zero PCI na Veg.ana.** Tokenização de cartão fora do nosso domínio = 95% do compliance PCI já resolvido por AbacatePay. Implementar campos de cartão dentro do site exige PCI-DSS SAQ A-EP mínimo — não compensa pro volume.
- **3DS (3D Secure) no cartão:** responsabilidade do gateway no fluxo hospedado. Transparente exigiria SDK de 3DS no cliente — mais código, mais superfície de ataque.
- **Parcelamento no cartão:** UI nativa do gateway mostra parcelas. Replicar essa UI na Veg.ana com todas as regras de juro/bandeira é over-engineering.

**Trade-off aceito:** dois fluxos de UX distintos (PIX inline vs cartão redirect). Compensado por: 80%+ dos pedidos vai ser PIX (confeitaria BH), então a experiência dominante é a boa.

**Reversibilidade:** alta. Trocar PIX pra hospedado depois é remover componente + adicionar redirect — 1 dia. Trocar cartão pra transparente é projeto (3DS + tokenização + PCI) — não faremos cedo.

### D2 — **SDK oficial Node do AbacatePay via npm** (com fallback pra fetch + Zod)

- **Primeira escolha:** SDK Node oficial (nome exato do pacote = **Open Question 1**). Pin de versão em `package.json` via `^major.minor.patch` travado.
- **Segunda escolha (fallback):** se SDK for pouco mantido (<1 release/trimestre, issues abertos >30 dias), usar `fetch` nativo do Next.js server + Zod schemas publicados pela AbacatePay (`@abacatepay/zod` ou equivalente — confirmar na Open Question 1).

**Por quê:**

- **SDK oficial = superfície menor no código.** Tipos pré-validados, retry built-in se houver, upgrade via `npm update`.
- **Fetch direto = controle total** mas exige manter schemas em dia manualmente. Só se SDK for ruim.
- **Nunca fetch sem Zod.** Mesmo com SDK, validar `Zod.parse(response)` na fronteira garante que mudança de shape da API quebra o build, não a produção.

**Trade-off aceito:** dependência de mais uma lib. Compensado pela qualidade dos tipos e pelo fato de AbacatePay publicar SDK oficial (sinal de compromisso com DX).

### D3 — **API keys server-only**, ESLint plugin oficial ativo, dev/prod separados

- `ABACATEPAY_API_KEY` — env var **server-only**. Nunca `NEXT_PUBLIC_*`. Usada em Server Actions e Route Handlers (`src/app/api/**`).
- `ABACATEPAY_WEBHOOK_SECRET` — env var server-only. Usada só no handler de webhook.
- `ABACATEPAY_ENV` — `'dev' | 'prod'` — seleciona base URL e chave correta (via `process.env` mapping em `src/server/payments/abacatepay-config.ts`).
- **Plugin ESLint oficial AbacatePay** instalado em `eslint.config.mjs` pra bloquear leak de chave em código (detecta string com prefixo da API key).
- CI/CD (GitHub Actions quando chegar): secret scan + `git-secrets` no pre-commit hook.

**Por quê:**

- **Leak de API key de gateway = catástrofe financeira.** Qualquer pessoa com a chave pode criar cobranças e esvaziar a conta (no caso de saque). Plugin oficial é defense in depth.
- **Ambientes separados:** Dev Mode cobranças não vão pra produção. Variável única (`ABACATEPAY_ENV`) centraliza o toggle em UM ponto — evita "esqueci de trocar a base URL".
- **Service role isolada:** mesma lógica do Supabase service role. Nunca exposta no bundle client.

**Trade-off aceito:** uma env var a mais (`ABACATEPAY_ENV`). Vale o clareamento operacional.

### D4 — Webhook **`POST /api/webhooks/abacatepay`** com HMAC + idempotência via `payments.idempotency_key`

Fluxo:

```
AbacatePay → POST /api/webhooks/abacatepay (JSON)
   ↓
1. Ler header `X-AbacatePay-Signature` (nome real = Open Question — verificar doc)
2. Calcular HMAC-SHA256(body, ABACATEPAY_WEBHOOK_SECRET)
3. Comparar em tempo constante (crypto.timingSafeEqual)
   ↓ (falha = 401, NÃO processar)
4. Parse Zod do body (shape validado)
5. Extrair idempotency_key (webhook event ID único do AbacatePay)
6. Tentar INSERT em `payments` com esse idempotency_key
   ↓ (UNIQUE violation = já processado, retornar 200 OK sem mais side-effect)
7. Se INSERT novo: atualizar `orders.payment_status`, inserir `order_status_history`
   ↓
8. Retornar 200 OK (sempre 200 se HMAC ok e validação passou, pra não retriggerar retry)
```

**Por quê:**

- **HMAC antes de qualquer coisa.** Não loga, não parseia, não insere nada antes de validar assinatura. Atacante não deve conseguir poluir log nem db.
- **Idempotência via UNIQUE constraint no BD** é à prova de race condition (dois webhook retries simultâneos — um passa, outro erra com UNIQUE). Simples, atômico.
- **Retornar 200 em "já processado"** evita backoff agressivo do AbacatePay (se retornar 4xx/5xx, eles vão retry mais vezes).
- **Log pós-validação:** logar `{ event_id, order_id, status }` — nunca corpo inteiro (pode ter PII do pagador).

**Trade-off aceito:** handler é ~80 linhas. Dá pra extrair helper. Vale o investimento porque é ponto quente de segurança.

### D5 — Eventos consumidos no Sprint 1: **apenas "pagamento aprovado"**

- **Consumir:** `payment.approved` (ou nome real — verificar doc do AbacatePay — **Open Question 7**).
- **Ignorar no Sprint 1:** `withdrawal.completed` (saque concluído — operação financeira da Veg.ana, não afeta pedido do cliente), `payment.refused`, `payment.refunded` (fora de Sprint 1 ou mapeado só em log de auditoria).

**Por quê:**

- Sprint 1 precisa do mínimo pra o kanban mudar "aguardando pagamento" → "novo pedido". "Saque concluído" é um relatório financeiro da mãe, não muda estado de pedido nenhum.
- Evento recusado/falho: pedido fica em `pending` e na UI aparece "pagamento não confirmado ainda". Mãe liga se for caso ou cliente tenta de novo. Sem automação ainda.
- Refund é fora de Sprint 1 inteiro (ver D7).

**Trade-off aceito:** mão na massa pra mãe em caso de recusa. Em volume atual (50–80/mês), ela consegue tratar 1–2 casos de recusa manualmente sem fricção.

### D6 — **Fallback se AbacatePay estiver fora**

Se `/payment/create` falhar (timeout, 5xx, network error):

1. Pedido **É criado** em `orders` mesmo assim, com `payment_status = 'pending'` e `status = 'NOVO'`.
2. `payments` recebe um row `status = 'failed'` com `raw_payload` contendo o erro.
3. UI do cliente mostra banner: **"Seu pedido foi registrado. Tivemos um problema com o pagamento — a Veg.ana vai te chamar no WhatsApp nos próximos minutos para confirmar."**
4. Admin kanban destaca card com badge vermelha `⚠️ falha no pagamento`.
5. Mãe decide: liga pra cliente oferecer retry, oferece pagar na entrega (provider `manual`), ou cancela.

**Por quê:**

- **Premium não bloqueia cliente por falha nossa.** Gateway offline é problema de infra — o pedido já foi decisão do cliente, não queremos perder.
- `provider = 'manual'` em `payments` (definido em ADR 0008 D9) existe exatamente pra esse caso — pagamento fora do sistema, registrado à mão depois.
- Mãe em loop com o cliente resolve > algoritmo tentando adivinhar. Volume é baixo.

**Trade-off aceito:** pedido pode ficar "pendurado" até alguém intervir. UI destaca pra não esquecer. Analytics pode trackar "taxa de falha AbacatePay" se virar relevante.

### D7 — **Refund fora do Sprint 1**

- **Regra Sprint 1:**
  - Cliente cancela pedido **antes** de pagar (`payment_status = 'pending'`): cancela direto, nada a refundar.
  - Cliente cancela pedido **depois** de pagar: mãe opera refund **manualmente** via dashboard AbacatePay + muda status pra `CANCELADO` no admin. Sem botão "estornar" na Veg.ana ainda.
- **Open Question 2:** automatizar refund (botão no kanban chama API AbacatePay) em Sprint 2+.

**Por quê:**

- Refund é fluxo de exceção em confeitaria (expectativa <5% dos pedidos cancelados após pagamento).
- Botão de estorno direto é feature sensível — dá pra estornar por engano e perder dinheiro. Exigir 2FA ou passo extra é trabalho.
- Operação manual no dashboard AbacatePay é seguro por padrão (tem UI de confirmação dupla no próprio gateway).

**Trade-off aceito:** fricção operacional pontual pra mãe. Baixíssima frequência.

### D8 — **Métodos habilitados no Sprint 1: PIX (obrigatório) + cartão crédito 1x–3x (opcional)**. Boleto **fora**.

- **PIX:** sempre disponível. Default pré-selecionado no checkout (confeitaria BH = PIX-heavy).
- **Cartão de crédito:** habilitado com parcelamento **1x, 2x, 3x**. Acima disso não faz sentido em ticket R$ 44–49.
  - **Juro:** confirmar com Pedro se absorve ou repassa (**Open Question 5**). Default sugerido: 1x sem juros, 2x–3x com juro do emissor repassado (Veg.ana não subsidia).
- **Boleto:** **FORA.** Confeitaria é perecível D+1. Boleto compensa em D+1 útil bancário (pior caso D+3 em feriado). Pedido de sexta = entrega só na quarta = massa estragada. Nunca faz sentido.

**Por quê:**

- PIX domina a realidade do negócio hoje.
- Cartão atende fatia de cliente que paga salário/vale-alimentação e quer parcelar marginalmente — é bom ter, não crítico.
- Boleto introduz risco operacional grande pra ganho residual — descartado taxativamente.

**Reversibilidade:** alta. Adicionar boleto depois (se começar a vender produto não-perecível, tipo "kit não-gelado") é toggle no checkout + permissão no AbacatePay.

### D9 — **Sandbox:** AbacatePay Dev Mode isolado via `ABACATEPAY_ENV=dev`

- Durante todo o Sprint 1 (antes do OK final do Lead): `ABACATEPAY_ENV=dev`.
- Chave dev vai em `.env.local` (já listada no `.env.local.example` — Pedro atualiza direto).
- Antes de ir pra prod: troca de var, teste de smoke (1 pedido real PIX de R$ 1 feito pela mãe no celular dela).
- **Webhook de dev** aponta pra URL pública do ambiente de preview do Vercel (ou tunnel tipo ngrok em dev local). URL de prod aponta pro domínio final.

**Por quê:**

- Dev Mode AbacatePay simula pagamento (Pedro confirmou) — permite testar fluxo completo sem dinheiro real.
- Separação de ambientes é mandatória — misturar é receita pra criar cobrança de teste em conta de produção.

### D10 — **Split de pagamento / multi-vendor: N/A**

Veg.ana é **solo seller** (1 confeitaria, 1 CNPJ/MEI). Nada de split pra produtores, marketplace, etc. Se virar plataforma algum dia, ADR novo.

### D11 — **Antifraude**

- **Cartão:** motor antifraude do AbacatePay se oferecido (opt-in, verificar na doc). Sprint 1: aceita recomendação padrão.
- **PIX:** assíncrono por natureza (cliente paga primeiro, fraude é sobre volta do recurso pro bolso do pagador). Zero antifraude nosso.
- **Captcha no checkout:** fora de Sprint 1. Volume baixo demais pra atrair bot.

**Reversibilidade:** alta. Captcha e motor antifraude custom são plug-ins futuros.

### D12 — **Timeout de QR PIX + cancelamento automático**

- **QR gerado pelo AbacatePay:** expira em tempo X default (verificar doc — **Open Question 3**).
- **Pedido não pago após Y minutos:** cancela automaticamente? **Open Question 6 pra Pedro.** Proposta do arquiteto:
  - Se QR expira em 1h (default comum): pedido cancela auto em 1h15min (graça de 15min).
  - Implementação: cron-like via Supabase Edge Function `cleanup-expired-orders` rodando a cada 15min, ou Vercel Cron.
  - Alternativa baixa-tech: mãe cancela manualmente pelos "pendings" que ficarem no kanban sem confirmação.

**Por quê:**

- Pedidos em `pending` acumulam e poluem o kanban. Precisa de limpeza.
- Mas cancelar rápido demais frustra cliente que está pagando (ex: abriu banco, digitou PIX, demorou 10min).
- Decidir com Pedro antes de implementar. Default seguro: **não implementa auto-cancel no Sprint 1**, mãe gerencia manualmente. Barata de reverter (adicionar cron depois).

---

## 3. Matriz de custo/reversão

| Decisão | Custo impl. | Custo operac. | Custo reversão | Escolha |
|---|---|---|---|---|
| D1 híbrido (PIX transparente + cartão hospedado) | médio | baixo | **baixo** | **Híbrido** |
| D2 SDK Node oficial | baixo | baixo | trivial (trocar por fetch) | **SDK** |
| D3 keys server-only + plugin ESLint | baixo | zero | trivial | **Feito** |
| D4 webhook HMAC + idempotência | médio | baixo | alto (se mal feito) | **Bem feito já** |
| D5 só "payment.approved" | trivial | baixo | trivial (adicionar listener) | **Mínimo viável** |
| D6 fallback `manual` | baixo | baixo | trivial | **Feito** |
| D7 refund manual | zero | médio (mãe opera) | trivial | **Manual** |
| D8 PIX + cartão 3x, sem boleto | trivial | zero | trivial | **Feito** |
| D9 dev mode isolado | baixo | zero | trivial | **Feito** |
| D12 auto-cancel PIX | médio | baixo | trivial | **Adiar — decisão de Pedro** |

---

## 4. Consequências

### Positivas

- **UX premium preservada:** PIX transparente mantém marca; cartão hospedado vira só "checkout seguro, volta pra cá".
- **Segurança em camadas:** key server-only + HMAC + plugin ESLint + ambientes separados = defense in depth real.
- **Idempotência desde o dia 1:** `payments.idempotency_key` UNIQUE evita bug de pagamento duplicado em retry de webhook — bug clássico de produção em e-commerce iniciante.
- **Fallback não bloqueia cliente:** gateway fora = pedido fica pending, mãe resolve. Zero pedido perdido por erro de infra.
- **Escopo mínimo Sprint 1:** 1 evento consumido, 2 métodos habilitados, 1 flow fallback. Cabe na sprint.

### Negativas / Custos aceitos

- **Dois flows de UX distintos (transparente vs hospedado):** dobra a superfície de teste. Mitigado por: 80% dos pedidos serão PIX, foco de QA ali.
- **Refund manual:** fricção pra mãe em caso raro. Aceitável no volume atual.
- **Auto-cancel não implementado (decisão pendente):** kanban pode acumular "pending" antigos. Mitigação: filtro default "últimas 48h" no kanban + botão "limpar pendentes".
- **Nome do pacote SDK não confirmado:** Open Question 1. Impede começar a codar o client até Pedro descobrir. Trabalhável em paralelo enquanto faz migrations Supabase.

### A monitorar

- **Taxa de falha de `/payment/create`:** se >2%, reavaliar (gateway instável).
- **Latência de webhook (receive → DB commit):** target <1s. Se degradar, investigar.
- **Volume de pedidos `payment_status = 'pending'` antigos:** se >10% do kanban, auto-cancel vira prioridade.
- **Refunds manuais:** se >5% dos pedidos, automatizar sobe na fila.

---

## 5. Alternativas consideradas

### 5.1. Checkout 100% hospedado (tudo fora do site)

- **Descartado:** quebra experiência premium no PIX, que é 80% do volume. Redirect no momento de pagar é fricção desnecessária pra método assíncrono simples.

### 5.2. Checkout 100% transparente (incluindo cartão)

- **Descartado:** exige PCI-DSS + tokenização no cliente + 3DS client-side. Trabalho grande pra ganho marginal em volume baixo. Revisitar se ticket subir pra R$ 200+ e cartão virar método dominante.

### 5.3. Fetch direto sem SDK

- **Descartado por padrão:** só se SDK oficial for ruim. SDK bem mantido sempre vale a pena pelo tipo-safety.

### 5.4. Webhook sem idempotência (confiar no retry comportado)

- **Descartado:** gateways retrigger webhook em caso de timeout — sem idempotência, cria payment duplicado = cobra cliente 2x = catastrófico pra confiança. UNIQUE constraint custa nada.

### 5.5. Aceitar boleto

- **Descartado:** compensação bancária + produto perecível = receita pra massa estragada. Nunca.

### 5.6. Cartão até 12x

- **Descartado:** ticket R$ 44–49, 12x = R$ 4/mês. UX ruim (formulário cheio de opções sem sentido), risco de chargeback sobe com parcelamento longo sem ganho.

---

## 6. Open Questions (pra Pedro decidir)

1. **Nome exato do pacote SDK Node AbacatePay no npm.** Verificar em `docs.abacatepay.com/reference` ou `npmjs.com/~abacatepay`. Pinar versão em `package.json` depois. Se não houver SDK Node estável, cair pro plano B (fetch + Zod schemas publicados).
2. **Formato numérico da API** (centavos integer vs reais decimal). Conferir `/payment/reference.md`. Adapter absorve diferença; BD continua integer (ADR 0008 D5).
3. **Tempo de expiração do QR PIX** (default + se é configurável no `/payment/create`). Impacta auto-cancel.
4. **Boleto: Sprint 2 ou nunca?** Recomendação do arquiteto: nunca, enquanto produto for perecível. Se entrar linha de produto não-perecível (panetone artesanal em caixa lacrada, por ex.), revisitar.
5. **Parcelamento cartão: máx 1x, 3x ou 6x?** E juro: Veg.ana absorve ou repassa? Recomendação: **1x sem juros, 2x–3x com juro repassado** (emissor).
6. **Timing de cancelamento automático de pedido não pago:** 15min? 1h? 24h? Nunca (manual)? Recomendação Sprint 1: **manual** (kanban + filtro), automatizar se virar problema.
7. **Nome exato dos eventos webhook do AbacatePay** (`payment.approved`? `billing.paid`? outro?) e do header de assinatura HMAC. Verificar doc antes de codar handler.
8. **Instalar plugin ESLint oficial do AbacatePay:** confirmar nome do pacote e configuração em `eslint.config.mjs` (Open Question dependente de 1).

---

## 7. Referências

- AbacatePay Docs: https://docs.abacatepay.com/
  - `/pages/authentication.md` — formato da API key
  - `/payment/create.md` — endpoint de criação de cobrança
  - `/payment/reference.md` — shape da API
  - `/webhooks/*` — eventos, assinatura HMAC, CRUD
- ADR 0008 — schema Supabase (define `payments` com `provider`, `idempotency_key`).
- ADR 0005 — máquina de estado de pedidos (define transição `NOVO → PREPARANDO` que depende de pagamento confirmado).
- Next.js 16 Route Handlers (para `/api/webhooks/abacatepay`): `node_modules/next/dist/docs/` conforme `AGENTS.md`.
- OWASP Webhook Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html
