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
- ✅ **Loja aberta** — `store_status = ATIVO` (Pedro ativou em `/gestao/configuracoes`; toggle confirmado no QA logado).
- ⏳ **Horários:** hoje são SEED genérico (seg fechado, ter-sex 9-19, sáb 10-18, dom 11-17). Conferir com a operação real da mãe.
- ✅ Anéis de entrega configurados (20 zonas).

## 2b. Limpeza pré-lançamento (feita 2026-05-30, QA logado)
- ✅ **Dados de teste zerados:** 11 pedidos fake (#1-6, #16-20) + cascade (itens/pagamentos/histórico) + 3 notificações lixo ("efwerewer", "asdsadas"…) removidos. Sequência de pedido reiniciada em 1. Relatórios/Clientes/Notificações começam do zero real.
- ✅ Triggers de proteção (`prevent_orders_delete`, `prevent_role_escalation`) restaurados após a limpeza.
- ✅ **QA admin logado** (e2e-test@veganabh.com, role=admin): painel, pedidos, cardápio, cupons, notificações, configurações, relatórios, clientes — todas renderizam, DS aplicado, **0 erro de console**.
- ⏳ **e2e-test** mantido como admin pra QA futura. **Trocar a senha de teste `123456789`** por uma definitiva (ou remover o user).
- ℹ️ Cupom `VEGANA10` (−10%, ativo) preservado — confirmar se é intencional pro lançamento.

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
