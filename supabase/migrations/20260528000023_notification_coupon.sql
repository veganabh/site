-- Migration 23 — Cupom na notificação
--
-- Liga notificação a um cupom: o CTA aplica o cupom no carrinho do cliente.
-- Guarda o CÓDIGO (denormalizado) — o fluxo de aplicação usa code via RPC
-- validate_coupon. Notificação é time-bound; se o cupom mudar/sumir depois,
-- a validação no clique resolve (rejeita se inválido).

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS coupon_code text;

COMMENT ON COLUMN public.notifications.coupon_code IS
  'Código de cupom opcional. Se setado, o CTA aplica o cupom no carrinho.';
