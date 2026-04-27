-- Migration 09 — Orders / Order Items / Order Status History (ADR 0008 D3, D6, D11, D12, D13, D16, D17, D18)
-- orders: hard-delete proibido. Máquina de estado via CHECK constraint + trigger.

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigserial UNIQUE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  shipping_address_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'NOVO'
    CONSTRAINT ck_orders_status_valid CHECK (
      status IN ('NOVO', 'PREPARANDO', 'PRONTO', 'A_CAMINHO', 'ENTREGUE', 'CANCELADO')
    ),
  payment_status text NOT NULL DEFAULT 'PENDENTE'
    CONSTRAINT ck_orders_payment_status_valid CHECK (
      payment_status IN ('PENDENTE', 'PAGO', 'ESTORNADO')
    ),
  source text NOT NULL DEFAULT 'site'
    CONSTRAINT ck_orders_source_valid CHECK (source IN ('site', 'ifood')),
  subtotal_cents integer NOT NULL
    CONSTRAINT ck_orders_subtotal_non_negative CHECK (subtotal_cents >= 0),
  shipping_fee_cents integer NOT NULL DEFAULT 0
    CONSTRAINT ck_orders_shipping_fee_non_negative CHECK (shipping_fee_cents >= 0),
  discount_total_cents integer NOT NULL DEFAULT 0
    CONSTRAINT ck_orders_discount_non_negative CHECK (discount_total_cents >= 0),
  total_cents integer NOT NULL
    CONSTRAINT ck_orders_total_non_negative CHECK (total_cents >= 0),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  coupon_code text,
  coupon_discount_cents integer,
  cancel_reason text,
  delivery_call_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_orders_cancel_reason_when_cancelled CHECK (
    (status <> 'CANCELADO') OR (cancel_reason IS NOT NULL AND char_length(cancel_reason) > 0)
  )
);

COMMENT ON TABLE public.orders IS
  'Pedidos. Hard-delete proibido — cancelamento via status=CANCELADO + cancel_reason.';
COMMENT ON COLUMN public.orders.order_number IS
  'Número humano (cozinha fala "pedido #1234"). bigserial UNIQUE. URL usa id (uuid).';
COMMENT ON COLUMN public.orders.shipping_address_snapshot IS
  'Snapshot imutável. Cliente pode alterar endereço salvo; pedido congela.';

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_profile_created
  ON public.orders (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders (payment_status);

DROP TRIGGER IF EXISTS tg_orders_touch_updated_at ON public.orders;
CREATE TRIGGER tg_orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── Order items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  is_kit boolean NOT NULL DEFAULT false,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_category text,
  qty integer NOT NULL
    CONSTRAINT ck_order_items_qty_positive CHECK (qty > 0),
  unit_price_site_cents integer NOT NULL
    CONSTRAINT ck_order_items_unit_price_site_non_negative CHECK (unit_price_site_cents >= 0),
  unit_price_ifood_cents integer NOT NULL DEFAULT 0
    CONSTRAINT ck_order_items_unit_price_ifood_non_negative CHECK (unit_price_ifood_cents >= 0),
  notes text,
  gift_kit_template_id uuid REFERENCES public.gift_kit_templates(id) ON DELETE SET NULL,
  kit_picks_snapshot jsonb,
  kit_packaging boolean NOT NULL DEFAULT false,
  kit_card_message text,
  kit_recipient_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_order_items_kit_has_template CHECK (
    (is_kit = false) OR (gift_kit_template_id IS NOT NULL AND kit_picks_snapshot IS NOT NULL)
  ),
  CONSTRAINT ck_order_items_product_when_not_kit CHECK (
    (is_kit = true) OR (product_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.order_items IS
  'Linhas do pedido. Produto avulso (is_kit=false) ou kit presente (is_kit=true).';

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON public.order_items (order_id);

-- ── Order status history ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL
    CONSTRAINT ck_order_status_history_status_valid CHECK (
      status IN ('NOVO', 'PREPARANDO', 'PRONTO', 'A_CAMINHO', 'ENTREGUE', 'CANCELADO')
    ),
  at timestamptz NOT NULL DEFAULT now(),
  changed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text
);

COMMENT ON TABLE public.order_status_history IS
  'Insert-only log de transições. Fonte para analytics ("tempo médio em PREPARANDO").';

CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON public.order_status_history (order_id, at);

-- Trigger: ao INSERT em orders, registra NOVO em history.
CREATE OR REPLACE FUNCTION public.log_initial_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_status_history (order_id, status, at, changed_by_profile_id)
  VALUES (NEW.id, NEW.status, NEW.created_at, NEW.profile_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_orders_log_initial_status ON public.orders;
CREATE TRIGGER tg_orders_log_initial_status
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_initial_order_status();

-- Trigger: ao UPDATE de status em orders, valida transição + registra history.
CREATE OR REPLACE FUNCTION public.log_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Máquina de estado: valida transição permitida
  v_valid := CASE OLD.status
    WHEN 'NOVO'       THEN NEW.status IN ('PREPARANDO', 'CANCELADO')
    WHEN 'PREPARANDO' THEN NEW.status IN ('PRONTO', 'CANCELADO')
    WHEN 'PRONTO'     THEN NEW.status IN ('A_CAMINHO', 'CANCELADO')
    WHEN 'A_CAMINHO'  THEN NEW.status = 'ENTREGUE'
    ELSE false
  END;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, at, changed_by_profile_id)
  VALUES (NEW.id, NEW.status, now(), auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_orders_log_status_transition ON public.orders;
CREATE TRIGGER tg_orders_log_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_transition();

-- Bloqueia DELETE em orders (hard-delete proibido)
CREATE OR REPLACE FUNCTION public.prevent_orders_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Hard-delete de orders proibido. Use status=CANCELADO.';
END;
$$;

DROP TRIGGER IF EXISTS tg_orders_prevent_delete ON public.orders;
CREATE TRIGGER tg_orders_prevent_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_orders_delete();

-- RLS orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_self_or_admin" ON public.orders;
CREATE POLICY "orders_select_self_or_admin" ON public.orders
  FOR SELECT USING (auth.uid() = profile_id OR public.is_admin());

-- INSERT: server action via service_role (checkout). Não expor ao client.
-- UPDATE: admin altera status. Cliente não pode mudar pedido depois de criar.
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RLS order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_self_or_admin" ON public.order_items;
CREATE POLICY "order_items_select_self_or_admin" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.profile_id = auth.uid() OR public.is_admin())
    )
  );

-- RLS order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history_select_self_or_admin" ON public.order_status_history;
CREATE POLICY "order_status_history_select_self_or_admin" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.profile_id = auth.uid() OR public.is_admin())
    )
  );
