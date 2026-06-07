# ADR 0014 — Tracking de conversão: Meta Pixel + Conversions API

**Status:** Proposto (aguarda OK do Pedro pós-confirmação do mapa de área iFood)
**Data:** 2026-06-06
**Autor:** vegana-bh-lead + site-architect
**Depende de:** ADR 0008 (schema), ADR 0009 (AbacatePay), ADR 0006 (zonas de entrega)
**Blueprint estratégico:** `../../../docs/TRACKING_PONTA_A_PONTA.md`

---

## 1. Contexto

Pré-requisito para tráfego pago. Pedro tem conta de anúncio Meta Business ativa e quer
mapear venda ponta a ponta **antes** de subir campanha. Hoje o site só tem PostHog
client-side (`src/lib/analytics.ts`, eventos: `add_to_cart`, `checkout_started`,
`order_placed`, `notification_cta_clicked`). Não há Meta Pixel nem Conversions API, nem
atribuição por campanha no banco.

Restrição estratégica: tráfego pago vai para o **site** (rastreável + margem maior), não
para o iFood (caixa-preta, sem pixel).

---

## 2. Decisões técnicas

### D1 — Pixel (browser) + Conversions API (server), com deduplicação

Pixel sozinho perde ~30% dos eventos (iOS/ad-block). CAPI server-side complementa.
Ambos enviam o mesmo `event_id` → a Meta deduplica. `Purchase` é a prioridade do CAPI.

### D2 — `Purchase` dispara na confirmação de pagamento, não no pedido criado

Fonte da verdade = webhook AbacatePay (status pago). Evita otimizar para pedido não pago.
Browser pode disparar um `Purchase` otimista na tela de sucesso **com o mesmo `event_id`**
do server (dedup cuida da duplicata); o server é o canônico.

### D3 — Camada Meta acoplada ao `analytics.ts` existente

Não criar pipeline paralelo. `captureEvent` ganha um espelho `fbq(...)`. Mapa:
`add_to_cart→AddToCart`, `checkout_started→InitiateCheckout`. Eventos novos
(`ViewContent`, `AddPaymentInfo`) entram no mesmo módulo. Mantém PostHog intacto.

### D4 — Atribuição persistida no Supabase (verdade própria)

Migration adiciona em `orders`: `utm_source, utm_medium, utm_campaign, utm_content,
utm_term, fbp, fbc, purchase_event_id`. UTM capturado no landing, cookies `_fbp`/`_fbc`
lidos do browser, tudo gravado no pedido. Permite reconciliar receita×campanha sem
depender do relatório da Meta.

### D5 — Provider de Pixel espelha o PostHog provider

Novo `src/components/providers/meta-pixel-provider.tsx` no padrão de
`posthog-provider.tsx`, montado no `layout.tsx`. No-op seguro se `NEXT_PUBLIC_META_PIXEL_ID`
ausente (mesma disciplina do analytics atual).

### D6 — Consentimento LGPD antes do disparo

Pixel é cookie de marketing. Gate de consentimento bloqueia disparo até o aceite.
Aproveitar a página `(institucional)/privacidade` existente.

### D7 — Hash de PII no CAPI

`user_data` (telefone/email) sempre SHA-256 antes de enviar. PII nunca em claro, nunca em
log (regra de segurança §8 do CLAUDE.md técnico).

---

## 3. Escopo de implementação (faseado, pós-OK)

| Fase | Entrega                                                            |
| ---- | ------------------------------------------------------------------ |
| 0    | Setup conta Meta (domínio, Pixel ID, token CAPI, AEM) — sem código |
| 1    | Provider Pixel + PageView                                          |
| 2    | Camada `fbq` no `analytics.ts` + `event_id`                        |
| 3    | `ViewContent` + `AddPaymentInfo`                                   |
| 4    | Migration UTM/fbp/fbc + captura no landing                         |
| 5    | `Purchase` via CAPI no webhook AbacatePay                          |
| 6    | `Lead` no clique WhatsApp                                          |
| 7    | Gate de consentimento LGPD                                         |
| 8    | Validação (Pixel Helper + Test Events + compra teste)              |
| 9    | Dashboard reconciliação receita×campanha                           |

---

## 4. Variáveis de ambiente

```
NEXT_PUBLIC_META_PIXEL_ID=
META_CAPI_ACCESS_TOKEN=        # server only
META_TEST_EVENT_CODE=          # só em teste
```

---

## 5. Consequências

**Positivas:** mídia paga mensurável ponta a ponta; atribuição própria independente da
Meta; `Purchase` confiável (server-side); reaproveita infra existente (analytics, providers,
webhook).

**Custos / riscos:** superfície nova (CAPI exige cuidado com hash de PII e dedup); consentimento
LGPD adiciona fricção no funil; iFood permanece não-mensurável (limite aceito); LTV ainda
estimado até o canal próprio acumular histórico.

**Alternativa descartada:** só Pixel browser (sem CAPI) — perde ~30% das conversões e degrada
a otimização da campanha. Não compensa o atalho.
