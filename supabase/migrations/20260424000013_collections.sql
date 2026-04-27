-- Migration 13 — Collections (super-categorias customizadas)
-- Curadoria editorial que agrega produtos de múltiplas categorias-mãe
-- sem duplicar estoque. product_ids uuid[] inline preserva ordem da curadoria;
-- volume pequeno (<20 produtos/coleção) torna array preferível a tabela join.
-- Padrão de uuid[] espelha gift_kit_slots.eligible_product_ids — sem FK
-- automática; integridade via filtro active/deleted_at na query de leitura.

CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Gift',
  route_path text,
  product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_collections_route_path_format CHECK (
    route_path IS NULL OR route_path ~ '^/[a-z0-9/-]*$'
  )
);

COMMENT ON TABLE public.collections IS
  'Super-categorias curadas. product_ids uuid[] preserva ordem; sem FK automática.';
COMMENT ON COLUMN public.collections.icon_name IS
  'Chave Lucide validada client-side via lib/collection-icons.ts (whitelist).';
COMMENT ON COLUMN public.collections.route_path IS
  'NULL = chip filtra ?col=<slug> na vitrine. Valor = chip aponta pra rota dedicada (ex: /presentear).';
COMMENT ON COLUMN public.collections.product_ids IS
  'UUIDs de products.id na ordem de exibição. Filtro active/deleted_at via JOIN na leitura.';
COMMENT ON COLUMN public.collections.sort_order IS
  'Ordem na chip bar — menor primeiro.';

-- Slug único entre coleções vivas
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_slug
  ON public.collections (slug) WHERE deleted_at IS NULL;

-- Listagem chip bar (active + ordem)
CREATE INDEX IF NOT EXISTS idx_collections_active_sort
  ON public.collections (active, sort_order) WHERE deleted_at IS NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_collections_touch_updated_at ON public.collections;
CREATE TRIGGER tg_collections_touch_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collections_select_public_or_admin" ON public.collections;
CREATE POLICY "collections_select_public_or_admin" ON public.collections
  FOR SELECT
  USING ((active = true AND deleted_at IS NULL) OR public.is_admin());

DROP POLICY IF EXISTS "collections_insert_admin" ON public.collections;
CREATE POLICY "collections_insert_admin" ON public.collections
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "collections_update_admin" ON public.collections;
CREATE POLICY "collections_update_admin" ON public.collections
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "collections_delete_admin" ON public.collections;
CREATE POLICY "collections_delete_admin" ON public.collections
  FOR DELETE USING (public.is_admin());

-- Seed estrutural: row "presentear" com chip especial → /presentear.
-- product_ids fica vazio aqui; populado via scripts/seed-collections.ts (dev)
-- ou painel admin (prod).
INSERT INTO public.collections (slug, name, tagline, icon_name, route_path, sort_order, active)
VALUES (
  'presentear',
  'Para Presentear',
  'Doces que viajam bonito até a casa de quem você gosta',
  'Gift',
  '/presentear',
  0,
  true
)
ON CONFLICT DO NOTHING;
