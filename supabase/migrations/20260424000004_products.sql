-- Migration 04 — Products (ADR 0008 D3, D5, D6, D16, D18)
-- Espelha src/types/product.ts. Centavos integer, soft-delete, slug URL-safe.

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL
    CONSTRAINT ck_products_category_valid CHECK (
      category IN ('bolo-no-pote', 'bolo', 'docinho', 'edicao-especial')
    ),
  gramatura_g integer NOT NULL DEFAULT 0
    CONSTRAINT ck_products_gramatura_non_negative CHECK (gramatura_g >= 0),
  price_site_cents integer NOT NULL
    CONSTRAINT ck_products_price_site_positive CHECK (price_site_cents >= 0),
  price_ifood_cents integer NOT NULL
    CONSTRAINT ck_products_price_ifood_positive CHECK (price_ifood_cents >= 0),
  attributes text[] NOT NULL DEFAULT '{}'::text[],
  tags text[] NOT NULL DEFAULT '{}'::text[],
  contains text[] NOT NULL DEFAULT '{}'::text[],
  photo_url text NOT NULL,
  photo_alt text NOT NULL DEFAULT '',
  photo_secondary_url text,
  photo_secondary_alt text,
  active boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0
    CONSTRAINT ck_products_stock_non_negative CHECK (stock >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 3
    CONSTRAINT ck_products_low_stock_non_negative CHECK (low_stock_threshold >= 0),
  ifood_rating numeric(3, 2)
    CONSTRAINT ck_products_rating_range CHECK (ifood_rating IS NULL OR (ifood_rating >= 0 AND ifood_rating <= 5)),
  ifood_order_count integer
    CONSTRAINT ck_products_order_count_non_negative CHECK (ifood_order_count IS NULL OR ifood_order_count >= 0),
  serves integer
    CONSTRAINT ck_products_serves_positive CHECK (serves IS NULL OR serves > 0),
  freezable boolean,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'Catálogo. Soft-delete via deleted_at. Preços em centavos.';
COMMENT ON COLUMN public.products.slug IS 'URL-safe unique identifier. UNIQUE only when not deleted.';
COMMENT ON COLUMN public.products.attributes IS 'sem-lactose, vegano, sem-gluten, sem-ovo.';
COMMENT ON COLUMN public.products.contains IS 'Alérgenos presentes: castanha-de-caju, coco, cacau, soja, amendoim, trigo.';

-- Slug único entre produtos vivos
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug
  ON public.products (slug) WHERE deleted_at IS NULL;

-- Listagem catálogo (categoria + ativo)
CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON public.products (category, active) WHERE deleted_at IS NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_products_touch_updated_at ON public.products;
CREATE TRIGGER tg_products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- SELECT público: produto ativo + não deletado; admin vê tudo.
DROP POLICY IF EXISTS "products_select_public_or_admin" ON public.products;
CREATE POLICY "products_select_public_or_admin" ON public.products
  FOR SELECT
  USING (
    (active = true AND deleted_at IS NULL)
    OR public.is_admin()
  );

-- INSERT/UPDATE/DELETE: só admin.
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE USING (public.is_admin());
