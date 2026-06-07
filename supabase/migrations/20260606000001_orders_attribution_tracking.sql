-- ============================================================================
-- Migration: orders_attribution_tracking (Etapa 4 — tracking de tráfego pago)
-- Adiciona atribuição de campanha + identificadores Meta na tabela orders.
--
-- Aditivo e nullable (exceto purchase_event_id, que ganha default) →
-- backward-compatible: código atual ignora as colunas, não quebra.
--
-- Uso:
--  - utm_*           : capturados no landing a partir da URL do anúncio.
--  - fbp / fbc       : cookies _fbp/_fbc do Meta Pixel (matching do CAPI).
--  - purchase_event_id: id de deduplicação do evento Purchase (browser × CAPI).
-- Blueprint: ../../../docs/TRACKING_PONTA_A_PONTA.md · ADR 0014.
-- ============================================================================

alter table public.orders
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbp text,
  add column if not exists fbc text,
  add column if not exists purchase_event_id uuid not null default gen_random_uuid();

comment on column public.orders.utm_campaign is
  'Atribuicao de trafego pago: utm_campaign capturado no landing (Meta tracking, Etapa 4).';
comment on column public.orders.fbp is
  'Cookie _fbp do Meta Pixel — matching server-side via Conversions API.';
comment on column public.orders.fbc is
  'Cookie _fbc do Meta Pixel — matching server-side via Conversions API.';
comment on column public.orders.purchase_event_id is
  'ID de deduplicacao do evento Purchase (browser Pixel x CAPI). Default gera um por pedido.';

-- Reconciliacao receita x campanha (dashboard, Etapa 9).
create index if not exists idx_orders_utm_campaign
  on public.orders (utm_campaign)
  where utm_campaign is not null;
