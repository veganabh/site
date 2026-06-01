-- Migration 003 (2026-06-01) — Feature Encomendas (ADR 0013)
--
-- Adiciona suporte a pré-venda agendada:
--   • orders: discriminador order_type + scheduled_date/hour + delivered_at
--   • products: flag available_for_preorder
--   • store_settings: configurações de encomenda (lead, capacidade, janela horária)
--
-- Decisões de schema (ADR 0013):
--   - Discriminador em orders (D1) — sem tabela separada.
--   - delivered_at derivado de trigger ao ENTREGUE (D3) — auditável.
--   - Constraint: preorder exige scheduled_date + scheduled_hour NOT NULL.
--   - store_settings singleton 'default' ganha 6 colunas.

-- ── 1. orders — novos campos ──────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'daily'
    CONSTRAINT ck_orders_order_type_valid CHECK (order_type IN ('daily', 'preorder')),
  ADD COLUMN IF NOT EXISTS scheduled_date date NULL,
  ADD COLUMN IF NOT EXISTS scheduled_hour int NULL
    CONSTRAINT ck_orders_scheduled_hour_range CHECK (scheduled_hour IS NULL OR (scheduled_hour BETWEEN 0 AND 23)),
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;

COMMENT ON COLUMN public.orders.order_type IS
  'Discriminador: daily = pedido do dia; preorder = encomenda futura (ADR 0013 D1).';
COMMENT ON COLUMN public.orders.scheduled_date IS
  'Data de entrega acordada para encomendas. NULL para pedidos diários.';
COMMENT ON COLUMN public.orders.scheduled_hour IS
  'Hora inteira (0–23) de entrega acordada para encomendas. NULL para pedidos diários.';
COMMENT ON COLUMN public.orders.delivered_at IS
  'Timestamptz gravado pelo trigger quando status → ENTREGUE. Null até entrega (ADR 0013 D3).';

-- Constraint: preorder exige scheduled_date E scheduled_hour
ALTER TABLE public.orders
  ADD CONSTRAINT ck_orders_preorder_needs_schedule CHECK (
    order_type = 'daily'
    OR (scheduled_date IS NOT NULL AND scheduled_hour IS NOT NULL)
  );

-- Índice para gestão de encomendas (kanban + calendário)
CREATE INDEX IF NOT EXISTS idx_orders_preorder_date
  ON public.orders (order_type, scheduled_date)
  WHERE order_type = 'preorder';

-- ── 2. Trigger: gravar delivered_at quando status → ENTREGUE ─────────────────
--
-- Atualiza a função log_order_status_transition existente para, além do histórico,
-- gravar delivered_at na orders row quando o novo status é ENTREGUE.

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

  -- ADR 0013 D3: grava delivered_at quando status vira ENTREGUE.
  IF NEW.status = 'ENTREGUE' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. products — flag de disponibilidade para encomenda ─────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS available_for_preorder boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.available_for_preorder IS
  'Produto aparece na rota /encomendas e aceita pré-venda. Ignorado estoque.';

CREATE INDEX IF NOT EXISTS idx_products_available_for_preorder
  ON public.products (available_for_preorder)
  WHERE available_for_preorder = true;

-- ── 4. store_settings — configurações de encomenda ───────────────────────────

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS preorder_min_lead_days int NOT NULL DEFAULT 3
    CONSTRAINT ck_store_settings_preorder_min_lead_days_pos CHECK (preorder_min_lead_days >= 0),
  ADD COLUMN IF NOT EXISTS preorder_max_lead_days int NOT NULL DEFAULT 60
    CONSTRAINT ck_store_settings_preorder_max_lead_days_pos CHECK (preorder_max_lead_days >= 1),
  ADD COLUMN IF NOT EXISTS preorder_min_value_cents int NOT NULL DEFAULT 10000
    CONSTRAINT ck_store_settings_preorder_min_value_pos CHECK (preorder_min_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS preorder_daily_capacity int NULL
    CONSTRAINT ck_store_settings_preorder_daily_capacity_pos CHECK (preorder_daily_capacity IS NULL OR preorder_daily_capacity >= 1),
  ADD COLUMN IF NOT EXISTS preorder_hour_from int NOT NULL DEFAULT 9
    CONSTRAINT ck_store_settings_preorder_hour_from_range CHECK (preorder_hour_from BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS preorder_hour_to int NOT NULL DEFAULT 18
    CONSTRAINT ck_store_settings_preorder_hour_to_range CHECK (preorder_hour_to BETWEEN 0 AND 23);

-- Constraint lógica: hour_from < hour_to
ALTER TABLE public.store_settings
  ADD CONSTRAINT ck_store_settings_preorder_hour_range CHECK (preorder_hour_from < preorder_hour_to);

COMMENT ON COLUMN public.store_settings.preorder_min_lead_days IS
  'Mínimo de dias de antecedência para encomenda (ex: 3 = a partir de hoje+3).';
COMMENT ON COLUMN public.store_settings.preorder_max_lead_days IS
  'Máximo de dias de antecedência para encomenda.';
COMMENT ON COLUMN public.store_settings.preorder_min_value_cents IS
  'Valor mínimo do pedido de encomenda em centavos (default R$100,00).';
COMMENT ON COLUMN public.store_settings.preorder_daily_capacity IS
  'Capacidade máxima de encomendas por dia. NULL = ilimitado.';
COMMENT ON COLUMN public.store_settings.preorder_hour_from IS
  'Hora inicial (inteira, 0–23) da janela de entrega de encomendas.';
COMMENT ON COLUMN public.store_settings.preorder_hour_to IS
  'Hora final (inteira, 0–23) da janela de entrega de encomendas.';

-- ── 5. Habilitar realtime para a coluna order_type (reusa publication existente)
-- orders já está em realtime publication (migration 20260529000025).
-- Nenhuma ação adicional necessária — novos campos aparecem automaticamente.
