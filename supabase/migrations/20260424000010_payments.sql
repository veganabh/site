-- Migration 10 — Payments (ADR 0008 D9, D16, D17)
-- Tabela separada de orders. Webhook AbacatePay escreve aqui via idempotency_key.

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'abacatepay'
    CONSTRAINT ck_payments_provider_valid CHECK (provider IN ('abacatepay', 'manual')),
  provider_charge_id text,
  method text
    CONSTRAINT ck_payments_method_valid CHECK (
      method IS NULL OR method IN ('pix', 'credit_card')
    ),
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT ck_payments_status_valid CHECK (
      status IN ('pending', 'paid', 'failed', 'refunded')
    ),
  amount_cents integer NOT NULL
    CONSTRAINT ck_payments_amount_non_negative CHECK (amount_cents >= 0),
  idempotency_key text UNIQUE,
  raw_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS
  '1:N de orders. Tentativas de pagamento (PIX expirado + cartão recusado + cartão aprovado).';
COMMENT ON COLUMN public.payments.idempotency_key IS
  'Chave que o webhook AbacatePay manda. UNIQUE bloqueia reprocessamento duplicado.';
COMMENT ON COLUMN public.payments.raw_payload IS
  'Webhook cru. Fonte de verdade para auditoria/reconciliação.';

CREATE INDEX IF NOT EXISTS idx_payments_order
  ON public.payments (order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_provider_charge
  ON public.payments (provider_charge_id)
  WHERE provider_charge_id IS NOT NULL;

DROP TRIGGER IF EXISTS tg_payments_touch_updated_at ON public.payments;
CREATE TRIGGER tg_payments_touch_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- Bloqueia hard-delete em payments
CREATE OR REPLACE FUNCTION public.prevent_payments_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Hard-delete de payments proibido.';
END;
$$;

DROP TRIGGER IF EXISTS tg_payments_prevent_delete ON public.payments;
CREATE TRIGGER tg_payments_prevent_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payments_delete();

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_self_or_admin" ON public.payments;
CREATE POLICY "payments_select_self_or_admin" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND (o.profile_id = auth.uid() OR public.is_admin())
    )
  );

-- INSERT/UPDATE: só service_role (webhook server-side).
-- RLS padrão do Supabase já isola: policies acima não permitem → bloqueia anon e authenticated.
