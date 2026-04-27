-- Migration 06 — Gift Kits (ADR 0008 D13, D18)
-- Templates + slots com eligible_product_ids uuid[].
-- KitCartItem vira order_item is_kit=true (migration 09).

CREATE TABLE IF NOT EXISTS public.gift_kit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL
    CONSTRAINT ck_gift_kit_templates_price_non_negative CHECK (price_cents >= 0),
  price_ifood_anchor_cents integer NOT NULL
    CONSTRAINT ck_gift_kit_templates_anchor_non_negative CHECK (price_ifood_anchor_cents >= 0),
  icon_name text NOT NULL DEFAULT 'Gift',
  cover_photo_url text NOT NULL,
  cover_photo_alt text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gift_kit_templates IS
  'Templates de kit presente. icon_name é chave Lucide resolvida no client.';
COMMENT ON COLUMN public.gift_kit_templates.price_ifood_anchor_cents IS
  'Âncora psicológica "no iFood seriam R$X". Fixa — não recalcula por escolha.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_kit_templates_slug
  ON public.gift_kit_templates (slug) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS tg_gift_kit_templates_touch_updated_at ON public.gift_kit_templates;
CREATE TRIGGER tg_gift_kit_templates_touch_updated_at
  BEFORE UPDATE ON public.gift_kit_templates
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS public.gift_kit_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.gift_kit_templates(id) ON DELETE CASCADE,
  slot_order integer NOT NULL
    CONSTRAINT ck_gift_kit_slots_order_positive CHECK (slot_order > 0),
  label text NOT NULL,
  helper text,
  qty integer NOT NULL DEFAULT 1
    CONSTRAINT ck_gift_kit_slots_qty_positive CHECK (qty > 0),
  eligible_product_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, slot_order)
);

COMMENT ON TABLE public.gift_kit_slots IS
  'Slots de cada template. eligible_product_ids é uuid[] — não cria FK automática. Filtro active/deleted via query.';

CREATE INDEX IF NOT EXISTS idx_gift_kit_slots_template
  ON public.gift_kit_slots (template_id, slot_order);

-- RLS
ALTER TABLE public.gift_kit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_kit_slots ENABLE ROW LEVEL SECURITY;

-- Templates: SELECT público (active + não deleted) ou admin.
DROP POLICY IF EXISTS "gift_kit_templates_select_public_or_admin" ON public.gift_kit_templates;
CREATE POLICY "gift_kit_templates_select_public_or_admin" ON public.gift_kit_templates
  FOR SELECT USING ((active = true AND deleted_at IS NULL) OR public.is_admin());

DROP POLICY IF EXISTS "gift_kit_templates_insert_admin" ON public.gift_kit_templates;
CREATE POLICY "gift_kit_templates_insert_admin" ON public.gift_kit_templates
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "gift_kit_templates_update_admin" ON public.gift_kit_templates;
CREATE POLICY "gift_kit_templates_update_admin" ON public.gift_kit_templates
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "gift_kit_templates_delete_admin" ON public.gift_kit_templates;
CREATE POLICY "gift_kit_templates_delete_admin" ON public.gift_kit_templates
  FOR DELETE USING (public.is_admin());

-- Slots: SELECT público (sempre visível se template visível) ou admin.
DROP POLICY IF EXISTS "gift_kit_slots_select_public_or_admin" ON public.gift_kit_slots;
CREATE POLICY "gift_kit_slots_select_public_or_admin" ON public.gift_kit_slots
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "gift_kit_slots_insert_admin" ON public.gift_kit_slots;
CREATE POLICY "gift_kit_slots_insert_admin" ON public.gift_kit_slots
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "gift_kit_slots_update_admin" ON public.gift_kit_slots;
CREATE POLICY "gift_kit_slots_update_admin" ON public.gift_kit_slots
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "gift_kit_slots_delete_admin" ON public.gift_kit_slots;
CREATE POLICY "gift_kit_slots_delete_admin" ON public.gift_kit_slots
  FOR DELETE USING (public.is_admin());
