-- Migration 14 — Delivery Persons (motoqueiros / entregadores)
-- Migrar mock-delivery-persons.ts → tabela. Soft-delete via deleted_at.
-- orders.delivery_call_id armazena UUID como text (sem FK pra preservar
-- histórico mesmo quando entregador é removido).

CREATE TABLE IF NOT EXISTS public.delivery_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
    CONSTRAINT ck_delivery_persons_name_nonempty CHECK (length(trim(name)) > 0),
  phone text NOT NULL
    CONSTRAINT ck_delivery_persons_phone_nonempty CHECK (length(trim(phone)) > 0),
  plate text NOT NULL
    CONSTRAINT ck_delivery_persons_plate_nonempty CHECK (length(trim(plate)) > 0),
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.delivery_persons IS
  'Entregadores cadastrados. Soft-delete via deleted_at. orders.delivery_call_id referencia id como text (sem FK).';

-- Telefone único entre ativos (permite reaproveitar número de entregador removido).
CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_persons_phone_active
  ON public.delivery_persons (phone)
  WHERE deleted_at IS NULL;

-- Index de listagem ativos (sorteio em callDelivery).
CREATE INDEX IF NOT EXISTS ix_delivery_persons_active
  ON public.delivery_persons (active)
  WHERE deleted_at IS NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS tg_delivery_persons_touch_updated_at ON public.delivery_persons;
CREATE TRIGGER tg_delivery_persons_touch_updated_at
  BEFORE UPDATE ON public.delivery_persons
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS
ALTER TABLE public.delivery_persons ENABLE ROW LEVEL SECURITY;

-- SELECT autenticado: cliente precisa ver nome/telefone/placa no timeline do pedido.
-- (Sem PII sensível além do que já é compartilhado no fluxo de entrega.)
DROP POLICY IF EXISTS "delivery_persons_select_authenticated" ON public.delivery_persons;
CREATE POLICY "delivery_persons_select_authenticated" ON public.delivery_persons
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- CUD admin-only.
DROP POLICY IF EXISTS "delivery_persons_insert_admin" ON public.delivery_persons;
CREATE POLICY "delivery_persons_insert_admin" ON public.delivery_persons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delivery_persons_update_admin" ON public.delivery_persons;
CREATE POLICY "delivery_persons_update_admin" ON public.delivery_persons
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delivery_persons_delete_admin" ON public.delivery_persons;
CREATE POLICY "delivery_persons_delete_admin" ON public.delivery_persons
  FOR DELETE TO authenticated
  USING (public.is_admin());
