-- Auto-aceitar pedidos: quando true, pedido pago entra direto em PREPARANDO;
-- quando false, pedido pago entra em NOVO para a gestora aceitar/recusar.
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.store_settings.auto_accept IS
  'Quando true, pedido pago entra direto em PREPARANDO (auto-aceitar). Quando false, pedido pago entra em NOVO para a gestora aceitar/recusar.';
