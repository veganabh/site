-- Migration 05 — Delivery Rings (ADR 0008 D14, D16, D18)
-- 20 anéis concêntricos 500m cada (total 10km). Seed na própria migration.

CREATE TABLE IF NOT EXISTS public.delivery_rings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ring_order integer NOT NULL UNIQUE
    CONSTRAINT ck_delivery_rings_order_range CHECK (ring_order BETWEEN 1 AND 20),
  inner_radius_m integer NOT NULL
    CONSTRAINT ck_delivery_rings_inner_non_negative CHECK (inner_radius_m >= 0),
  outer_radius_m integer NOT NULL
    CONSTRAINT ck_delivery_rings_outer_positive CHECK (outer_radius_m > 0),
  fee_cents integer NOT NULL
    CONSTRAINT ck_delivery_rings_fee_non_negative CHECK (fee_cents >= 0),
  eta_min integer NOT NULL
    CONSTRAINT ck_delivery_rings_eta_min_positive CHECK (eta_min > 0),
  eta_max integer NOT NULL
    CONSTRAINT ck_delivery_rings_eta_max_gte_min CHECK (eta_max >= eta_min),
  active boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_rings IS
  'Zonas de entrega por raio geográfico (haversine). 20 anéis fixos de 500m. Hard-delete proibido — usar active=false.';

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_delivery_rings_touch_updated_at ON public.delivery_rings;
CREATE TRIGGER tg_delivery_rings_touch_updated_at
  BEFORE UPDATE ON public.delivery_rings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Seed 20 anéis
-- Fee progressiva: R$0 até 500m, depois cresce. ETA 30-40min até 1km, cresce 5min por anel.
INSERT INTO public.delivery_rings (ring_order, inner_radius_m, outer_radius_m, fee_cents, eta_min, eta_max, active, label)
VALUES
  (1,   0,   500,   0, 30, 40, true,  'até 500m'),
  (2,  500, 1000, 500, 30, 45, true,  '500m – 1km'),
  (3, 1000, 1500, 700, 35, 50, true,  '1km – 1,5km'),
  (4, 1500, 2000, 900, 35, 50, true,  '1,5km – 2km'),
  (5, 2000, 2500, 1100, 40, 55, true, '2km – 2,5km'),
  (6, 2500, 3000, 1300, 40, 55, true, '2,5km – 3km'),
  (7, 3000, 3500, 1500, 45, 60, true, '3km – 3,5km'),
  (8, 3500, 4000, 1700, 45, 60, true, '3,5km – 4km'),
  (9, 4000, 4500, 1900, 50, 65, true, '4km – 4,5km'),
  (10, 4500, 5000, 2100, 50, 65, true, '4,5km – 5km'),
  (11, 5000, 5500, 2300, 55, 70, true, '5km – 5,5km'),
  (12, 5500, 6000, 2500, 55, 70, true, '5,5km – 6km'),
  (13, 6000, 6500, 2700, 60, 75, true, '6km – 6,5km'),
  (14, 6500, 7000, 2900, 60, 75, true, '6,5km – 7km'),
  (15, 7000, 7500, 3100, 65, 80, true, '7km – 7,5km'),
  (16, 7500, 8000, 3300, 65, 80, true, '7,5km – 8km'),
  (17, 8000, 8500, 3500, 70, 85, false, '8km – 8,5km'),
  (18, 8500, 9000, 3700, 70, 85, false, '8,5km – 9km'),
  (19, 9000, 9500, 3900, 75, 90, false, '9km – 9,5km'),
  (20, 9500, 10000, 4100, 75, 90, false, '9,5km – 10km')
ON CONFLICT (ring_order) DO NOTHING;

-- RLS
ALTER TABLE public.delivery_rings ENABLE ROW LEVEL SECURITY;

-- SELECT público (cliente precisa ver fee no checkout).
DROP POLICY IF EXISTS "delivery_rings_select_public" ON public.delivery_rings;
CREATE POLICY "delivery_rings_select_public" ON public.delivery_rings
  FOR SELECT USING (true);

-- UPDATE só admin. INSERT/DELETE só admin (por coerência, apesar de hard-delete desaconselhado).
DROP POLICY IF EXISTS "delivery_rings_update_admin" ON public.delivery_rings;
CREATE POLICY "delivery_rings_update_admin" ON public.delivery_rings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delivery_rings_insert_admin" ON public.delivery_rings;
CREATE POLICY "delivery_rings_insert_admin" ON public.delivery_rings
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delivery_rings_delete_admin" ON public.delivery_rings;
CREATE POLICY "delivery_rings_delete_admin" ON public.delivery_rings
  FOR DELETE USING (public.is_admin());
