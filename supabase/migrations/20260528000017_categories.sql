-- Migration 17 — Categorias dinâmicas (gerenciáveis pela dona)
--
-- Antes: products.category era text com CHECK travando 4 valores fixos.
-- Agora: tabela `categories` é a lista canônica, gerenciável no painel.
-- products.category continua text = slug (link por slug, sem FK rewrite).
-- CHECK removido para permitir slugs novos.
--
-- Política de exclusão: hard-delete livre (reset total do cardápio). Produtos
-- que referenciem slug inexistente caem em bucket "sem categoria" na UI —
-- nunca quebram.

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE public.categories IS 'Categorias de produto gerenciáveis. Link com products via slug.';
COMMENT ON COLUMN public.categories.slug IS 'Identificador estável usado em products.category.';

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_categories_touch_updated_at ON public.categories;
CREATE TRIGGER tg_categories_touch_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Índice de ordenação
CREATE INDEX IF NOT EXISTS idx_categories_sort
  ON public.categories (sort_order) WHERE deleted_at IS NULL;

-- Seed das 4 categorias que já existiam (idempotente)
INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('bolo-no-pote', 'Bolo no Pote', 1),
  ('bolo', 'Bolo', 2),
  ('docinho', 'Docinho', 3),
  ('edicao-especial', 'Edição Especial', 4)
ON CONFLICT (slug) DO NOTHING;

-- Libera slugs novos: remove o CHECK que travava as 4 categorias fixas
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS ck_products_category_valid;

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "categories_write_admin" ON public.categories;
CREATE POLICY "categories_write_admin" ON public.categories
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
