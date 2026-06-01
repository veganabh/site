-- ============================================================================
-- Migration: ifood_order_financials (P1)
-- Financeiro POR PEDIDO do relatório iFood "relatorio-pedidos" (ADR 0012, P1).
-- Dá taxa/líquido REAIS + nº de pedidos + ticket (que o snapshot por produto, P0,
-- não tinha). Idempotência por `ifood_order_id` (UUID do pedido no iFood).
--
-- Não vira pedido em `orders` (snapshot dedicado, mesma decisão do P0 — ADR 0012
-- D1). A API futura (ADR 0010) é que cria pedido real.
-- ============================================================================

create table if not exists public.ifood_order_financials (
  id uuid primary key default gen_random_uuid(),
  -- UUID do pedido no iFood ("ID COMPLETO DO PEDIDO") — idempotência.
  ifood_order_id text not null unique,
  import_id uuid references public.ifood_imports(id) on delete set null,
  ordered_at timestamptz not null,
  status text not null,
  -- "TOTAL PAGO PELO CLIENTE" — comparável ao total de um pedido do site.
  total_paid_cents integer not null default 0,
  -- "TAXAS E COMISSOES" em módulo (o relatório traz negativo).
  fees_cents integer not null default 0,
  -- "VALOR LIQUIDO" — líquido real recebido (pode passar o total via incentivo iFood).
  net_cents integer not null default 0,
  payment_method text,
  created_at timestamptz not null default now()
);

comment on table public.ifood_order_financials is
  'Financeiro por pedido iFood (relatorio-pedidos, ADR 0012 P1). Idempotente por ifood_order_id.';

create index if not exists idx_ifood_order_financials_ordered
  on public.ifood_order_financials (ordered_at);

alter table public.ifood_order_financials enable row level security;

drop policy if exists "ifood_order_financials_admin" on public.ifood_order_financials;
create policy "ifood_order_financials_admin" on public.ifood_order_financials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
