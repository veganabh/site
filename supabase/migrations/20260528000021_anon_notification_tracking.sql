-- Migration 21 — Atribuição de visitante anônimo (notificações)
--
-- Anônimo não tem profile_id. Usa anon_id (UUID de dispositivo, localStorage)
-- pra deduplicar leitura/clique por aparelho — sobrevive a F5.
--
-- Clicks: ganha coluna anon_id + unique parcial (dedup anon por dispositivo).
-- Reads anônimas: tabela própria (notification_reads exige user_id NOT NULL).

-- ── notification_clicks.anon_id ────────────────────────────────────────────────
ALTER TABLE public.notification_clicks
  ADD COLUMN IF NOT EXISTS anon_id text;

-- Dedup de clique anônimo por dispositivo (1 clique por anon_id por notificação).
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_clicks_anon
  ON public.notification_clicks (notification_id, anon_id)
  WHERE anon_id IS NOT NULL;

-- ── notification_anon_reads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_anon_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  anon_id text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_notification_anon_reads PRIMARY KEY (notification_id, anon_id)
);

COMMENT ON TABLE public.notification_anon_reads IS
  'Leituras de visitante anônimo (anon_id de dispositivo). Logado usa notification_reads.';

ALTER TABLE public.notification_anon_reads ENABLE ROW LEVEL SECURITY;

-- INSERT público — visitante registra a própria leitura (sem identidade pra checar).
DROP POLICY IF EXISTS "notification_anon_reads_insert" ON public.notification_anon_reads;
CREATE POLICY "notification_anon_reads_insert" ON public.notification_anon_reads
  FOR INSERT
  WITH CHECK (true);

-- SELECT só admin (métrica).
DROP POLICY IF EXISTS "notification_anon_reads_select_admin" ON public.notification_anon_reads;
CREATE POLICY "notification_anon_reads_select_admin" ON public.notification_anon_reads
  FOR SELECT
  USING (public.is_admin());
