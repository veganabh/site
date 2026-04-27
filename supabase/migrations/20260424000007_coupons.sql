-- Migration 07 — Coupons (ADR 0008 D3, D17, D18)
-- Cliente nunca SELECT direto — usa RPC validate_coupon.

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label text NOT NULL DEFAULT '',
  hint text NOT NULL DEFAULT '',
  type text NOT NULL
    CONSTRAINT ck_coupons_type_valid CHECK (type IN ('PERCENTUAL', 'FIXO', 'FRETE_GRATIS')),
  value integer NOT NULL DEFAULT 0
    CONSTRAINT ck_coupons_value_non_negative CHECK (value >= 0),
  min_order_value_cents integer,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0
    CONSTRAINT ck_coupons_used_count_non_negative CHECK (used_count >= 0),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'ATIVO'
    CONSTRAINT ck_coupons_status_valid CHECK (status IN ('ATIVO', 'INATIVO', 'EXPIRADO')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.coupons IS
  'Cupons. PERCENTUAL: value=%. FIXO: value=centavos. FRETE_GRATIS: value ignorado.';
COMMENT ON COLUMN public.coupons.value IS
  'Para PERCENTUAL é 0-100 (%). Para FIXO é centavos. Para FRETE_GRATIS é ignorado.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code
  ON public.coupons (upper(code)) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS tg_coupons_touch_updated_at ON public.coupons;
CREATE TRIGGER tg_coupons_touch_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RPC: cliente valida cupom sem expor a tabela.
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_cart_total_cents integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_discount_cents integer;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE upper(code) = upper(p_code)
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_coupon.status <> 'ATIVO' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'inactive');
  END IF;

  IF v_coupon.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_yet_valid');
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;

  IF v_coupon.min_order_value_cents IS NOT NULL
     AND p_cart_total_cents < v_coupon.min_order_value_cents THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'below_min_order',
      'min_order_value_cents', v_coupon.min_order_value_cents
    );
  END IF;

  v_discount_cents := CASE v_coupon.type
    WHEN 'PERCENTUAL' THEN (p_cart_total_cents * v_coupon.value / 100)
    WHEN 'FIXO'       THEN LEAST(v_coupon.value, p_cart_total_cents)
    WHEN 'FRETE_GRATIS' THEN 0
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'type', v_coupon.type,
    'discount_cents', v_discount_cents,
    'label', v_coupon.label,
    'hint', v_coupon.hint
  );
END;
$$;

COMMENT ON FUNCTION public.validate_coupon(text, integer) IS
  'Valida cupom + calcula desconto sem expor tabela de cupons ao cliente.';

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- SELECT: só admin. Cliente usa RPC.
DROP POLICY IF EXISTS "coupons_select_admin" ON public.coupons;
CREATE POLICY "coupons_select_admin" ON public.coupons
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "coupons_insert_admin" ON public.coupons;
CREATE POLICY "coupons_insert_admin" ON public.coupons
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "coupons_update_admin" ON public.coupons;
CREATE POLICY "coupons_update_admin" ON public.coupons
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "coupons_delete_admin" ON public.coupons;
CREATE POLICY "coupons_delete_admin" ON public.coupons
  FOR DELETE USING (public.is_admin());
