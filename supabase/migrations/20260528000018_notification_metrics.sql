-- Migration 18 — Métricas de notificação
--
-- Adiciona rastreio de clique de CTA (notification_clicks) e libera SELECT
-- admin em notification_reads para agregação de métricas no painel.
--
-- profile_id nullable: clique de visitante anônimo (audience "all") é
-- registrado sem identidade. Clique de cliente logado guarda o profile_id.

CREATE TABLE IF NOT EXISTS public.notification_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_clicks IS
  'Cliques no CTA de notificações. profile_id NULL = visitante anônimo.';

CREATE INDEX IF NOT EXISTS idx_notification_clicks_notif
  ON public.notification_clicks (notification_id);

ALTER TABLE public.notification_clicks ENABLE ROW LEVEL SECURITY;

-- INSERT: qualquer visitante registra o próprio clique (anon = profile_id NULL,
-- logado = seu próprio uid). Impede forjar clique em nome de outro usuário.
DROP POLICY IF EXISTS "notification_clicks_insert" ON public.notification_clicks;
CREATE POLICY "notification_clicks_insert" ON public.notification_clicks
  FOR INSERT
  WITH CHECK (profile_id IS NULL OR profile_id = auth.uid());

-- SELECT: só admin (agregação de métricas).
DROP POLICY IF EXISTS "notification_clicks_select_admin" ON public.notification_clicks;
CREATE POLICY "notification_clicks_select_admin" ON public.notification_clicks
  FOR SELECT
  USING (public.is_admin());

-- Admin passa a poder ler todas as leituras (métrica). Cliente continua
-- vendo só as próprias (policy notification_reads_select_own permanece).
DROP POLICY IF EXISTS "notification_reads_select_admin" ON public.notification_reads;
CREATE POLICY "notification_reads_select_admin" ON public.notification_reads
  FOR SELECT
  USING (public.is_admin());
