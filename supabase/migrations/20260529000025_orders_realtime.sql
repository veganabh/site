-- Migration 25 — Realtime em pedidos
--
-- Habilita postgres_changes (Supabase Realtime) em orders + order_status_history
-- pra o kanban atualizar cross-device em tempo real (substitui o BroadcastChannel,
-- que só funcionava no mesmo navegador). RLS filtra: admin recebe tudo.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
  END IF;
END $$;

-- REPLICA IDENTITY FULL: payload de UPDATE traz a linha completa.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
