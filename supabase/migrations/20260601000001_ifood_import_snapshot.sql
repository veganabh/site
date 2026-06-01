-- ============================================================================
-- Migration: ifood_import_snapshot (P0)
-- Snapshot dos relatórios iFood importados manualmente (ADR 0012), até a API
-- (ADR 0010 F3) substituir a fonte. NÃO usa pedidos sintéticos em `orders` —
-- snapshot dedicado pra não poluir contagem/ticket/geo/pico.
--
-- P0 cobre o relatório POR PRODUTO ("Itens do cardápio"): qtd + receita por
-- produto/período. O relatório financeiro por pedido vem em P1
-- (ifood_order_financials).
-- ============================================================================

-- 1. Lote de import — 1 linha por arquivo subido.
create table if not exists public.ifood_imports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('items', 'orders')),
  period_start date not null,
  period_end date not null,
  file_name text not null,
  row_count integer not null default 0 check (row_count >= 0),
  totals jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles(id) on delete set null,
  constraint ck_ifood_imports_period check (period_end >= period_start)
);

comment on table public.ifood_imports is
  'Um lote de import de relatório iFood (ADR 0012). Re-upload do mesmo kind+período substitui.';

-- Re-upload do mesmo período/kind substitui o anterior (apaga antes de inserir).
create unique index if not exists uq_ifood_imports_kind_period
  on public.ifood_imports (kind, period_start, period_end);

-- 2. Vendas por produto (relatório "Itens do cardápio").
create table if not exists public.ifood_product_sales (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.ifood_imports(id) on delete cascade,
  ifood_item_name text not null,
  product_id uuid references public.products(id) on delete set null,
  qty integer not null default 0 check (qty >= 0),
  revenue_cents integer not null default 0 check (revenue_cents >= 0),
  period_start date not null,
  period_end date not null
);

comment on table public.ifood_product_sales is
  'Vendas iFood por produto/período (qtd + receita). product_id null = nome não casado.';

create index if not exists idx_ifood_product_sales_import
  on public.ifood_product_sales (import_id);
create index if not exists idx_ifood_product_sales_product
  on public.ifood_product_sales (product_id);
create index if not exists idx_ifood_product_sales_period
  on public.ifood_product_sales (period_start, period_end);

-- 3. Mapeamento nome iFood → produto (persiste o casamento entre meses).
create table if not exists public.ifood_product_map (
  ifood_name text primary key,
  product_id uuid references public.products(id) on delete cascade,
  updated_at timestamptz not null default now()
);

comment on table public.ifood_product_map is
  'Casa o nome do item no relatório iFood com o produto do catálogo. Auto-aplica no próximo import.';

-- 4. RLS — tudo admin-only (tabelas internas de gestão).
alter table public.ifood_imports enable row level security;
alter table public.ifood_product_sales enable row level security;
alter table public.ifood_product_map enable row level security;

drop policy if exists "ifood_imports_admin" on public.ifood_imports;
create policy "ifood_imports_admin" on public.ifood_imports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ifood_product_sales_admin" on public.ifood_product_sales;
create policy "ifood_product_sales_admin" on public.ifood_product_sales
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ifood_product_map_admin" on public.ifood_product_map;
create policy "ifood_product_map_admin" on public.ifood_product_map
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
