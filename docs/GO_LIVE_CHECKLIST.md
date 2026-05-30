# Go-Live — Checklist Veg.ana

> Estado em 2026-05-30. ✅ verificado · ⏳ ação humana pendente · ℹ️ nota.
> Pagamento detalhado: ver `docs/abacatepay-go-live.md`.

## 1. Conteúdo / catálogo
- ✅ 20 produtos ativos, 5 categorias reais (categorias órfãs do seed removidas).
- ✅ 14 produtos com estoque > 0; esgotados aparecem cinza/"sem estoque".
- ⏳ **Fotos:** 12/20 ainda sem foto (placeholder gerado) — 8 já têm. Completar as 12 no editar. (Pedro definiu: por último.)
- ⏳ **Custo (CPV):** custo 0 na maioria → relatórios de margem zerados. Preencher quando possível.
- ⏳ **Preço de canal:** preço site = iFood em quase todos. Decidir desconto do canal próprio (objetivo do projeto: migrar do iFood). Estratégia, não código.

## 2. Loja / operação
- ⏳ **`store_status = PAUSADO`** no banco (atualizado 2026-05-28). Vitrine mostra "Loja fechada" **independente do horário**. Mudar para ATIVO em `/gestao/configuracoes` no momento de abrir pra valer.
- ℹ️ Diagnóstico: sábado 09:16 está dentro do horário (sáb 10-18 começa 10h, mas mesmo às 10h+ ficaria fechado) — o que fecha agora é o status PAUSADO, não o horário.
- ⏳ **Horários:** hoje são SEED genérico (seg fechado, ter-sex 9-19, sáb 10-18, dom 11-17). Conferir com a operação real da mãe.
- ✅ Anéis de entrega configurados (20 zonas).

## 3. Pagamento (AbacatePay)
- ⏳ **Confirmar no Vercel (prod):** `ABACATEPAY_API_KEY` = chave `abc_prod_…` e `ABACATEPAY_ENV=prod`.
- ⏳ **Webhook PROD** apontando para `https://www.veganabh.com.br/api/webhooks/abacatepay` com o secret correto.
- ⏳ **1 PIX real de teste** em produção (valor baixo) → confirmar que o pedido vira PAGO. Só o Pedro pode fazer (dinheiro real).
- ✅ Fluxo validado em sandbox (pedido simulado → PAGO via poll).

## 4. Env vars (Vercel · produção)
Necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`, `ABACATEPAY_ENV`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
- ⏳ WhatsApp Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) — só se/quando ativar envio automático; hoje WhatsApp é via link `wa.me`.

## 5. SEO / social
- ✅ `opengraph-image` (preview WhatsApp/Insta), `sitemap.xml`, `robots.txt` servindo.
- ✅ Páginas institucionais: `/privacidade` (LGPD), `/termos`, `/contato`.
- ✅ Footer renderiza com os 3 links + WhatsApp real.

## 6. Qualidade
- ✅ typecheck, lint (0 erros), 146 testes, build de produção — todos verdes.
- ✅ Design System F1→F5 aplicado (primitivos, tipografia, radius, a11y).
- ✅ A11y: contraste ≥4.5:1, alvos interativos com hit-area 44px (vitrine + admin).

## Resumo — o que falta pro lançamento (ação humana)
1. Confirmar AbacatePay prod (key + env + webhook) no Vercel.
2. 1 PIX real de teste → confirmar PAGO.
3. Conferir horários reais da loja.
4. (Quando der) fotos + custo dos produtos + preço de canal próprio.
