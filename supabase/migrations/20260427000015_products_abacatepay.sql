-- Migration 15 — Products: AbacatePay product ID (ADR 0009 cartão hospedado)
-- Endpoint /v2/checkouts/create exige `items[].id = prod_xxx` (produto pré-cadastrado
-- na AbacatePay). Este campo guarda a referência. Populado via
-- `npm run abacatepay:sync-products` (idempotente).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS abacatepay_product_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_abacatepay_id
  ON public.products (abacatepay_product_id)
  WHERE abacatepay_product_id IS NOT NULL;

COMMENT ON COLUMN public.products.abacatepay_product_id IS
  'ID retornado por POST /v2/products/create. Usado em checkouts/create (cartão hospedado). NULL = produto não sincronizado.';
