-- Migration 22 — Audiência de notificação: 3 públicos
--
-- Antes: 'all' (todos) | 'authed' (logado). Agora adiciona 'guest' (só visitante
-- não-logado). Regra de visibilidade:
--   all    → todos
--   authed → só logado (auth.uid() NOT NULL)
--   guest  → só visitante (auth.uid() IS NULL) — some quando o cliente loga.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS ck_notifications_audience_valid;
ALTER TABLE public.notifications
  ADD CONSTRAINT ck_notifications_audience_valid
  CHECK (audience IN ('all', 'authed', 'guest'));

DROP POLICY IF EXISTS "notifications_select_public" ON public.notifications;
CREATE POLICY "notifications_select_public" ON public.notifications
  FOR SELECT
  USING (
    published_at <= now()
    AND expires_at > now()
    AND (
      audience = 'all'
      OR (audience = 'authed' AND auth.uid() IS NOT NULL)
      OR (audience = 'guest' AND auth.uid() IS NULL)
    )
  );
