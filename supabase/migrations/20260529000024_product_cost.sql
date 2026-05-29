-- Migration 24 — Custo do produto (CPV) para cálculo de margem
--
-- cost_cents = custo de produção por unidade (centavos). Margem por produto =
-- (preço − custo) × unidades vendidas. Default 0 (mãe preenche no painel).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_cents integer NOT NULL DEFAULT 0
  CONSTRAINT ck_products_cost_nonneg CHECK (cost_cents >= 0);

COMMENT ON COLUMN public.products.cost_cents IS 'CPV — custo de produção por unidade (centavos).';
