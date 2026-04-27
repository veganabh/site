-- Migration 08 — User Addresses (ADR 0008 D12, D16, D18)
-- Endereços salvos do cliente. Pedido congela snapshot separadamente.

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Casa',
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL DEFAULT 'Belo Horizonte',
  state text NOT NULL DEFAULT 'MG'
    CONSTRAINT ck_user_addresses_state_length CHECK (char_length(state) = 2),
  cep text NOT NULL
    CONSTRAINT ck_user_addresses_cep_format CHECK (cep ~ '^\d{5}-?\d{3}$'),
  lat double precision,
  lng double precision,
  is_default boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_addresses IS
  'Endereços salvos no perfil. Pedido copia snapshot (orders.shipping_address_snapshot).';

CREATE INDEX IF NOT EXISTS idx_user_addresses_profile
  ON public.user_addresses (profile_id) WHERE deleted_at IS NULL;

-- Um único default por profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_default_per_profile
  ON public.user_addresses (profile_id)
  WHERE is_default = true AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS tg_user_addresses_touch_updated_at ON public.user_addresses;
CREATE TRIGGER tg_user_addresses_touch_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_addresses_select_self_or_admin" ON public.user_addresses;
CREATE POLICY "user_addresses_select_self_or_admin" ON public.user_addresses
  FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());

DROP POLICY IF EXISTS "user_addresses_insert_self" ON public.user_addresses;
CREATE POLICY "user_addresses_insert_self" ON public.user_addresses
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "user_addresses_update_self_or_admin" ON public.user_addresses;
CREATE POLICY "user_addresses_update_self_or_admin" ON public.user_addresses
  FOR UPDATE
  USING (auth.uid() = profile_id OR public.is_admin())
  WITH CHECK (auth.uid() = profile_id OR public.is_admin());

DROP POLICY IF EXISTS "user_addresses_delete_self_or_admin" ON public.user_addresses;
CREATE POLICY "user_addresses_delete_self_or_admin" ON public.user_addresses
  FOR DELETE USING (auth.uid() = profile_id OR public.is_admin());
