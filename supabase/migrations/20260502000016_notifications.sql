-- Migration 16 — Notifications (sino de broadcast da marca)
-- Canal de comunicação da marca → cliente: promos, lançamentos, operacional, conteúdo.
-- NÃO ligado a pedido — canal independente do ActiveOrderChip.
-- Admin gerencia via /gestao/notificacoes. Clientes leem via sino no TopBar.

BEGIN;

-- ── Tabela principal ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tipo de notificação — determina ícone no popover
  type         text NOT NULL
    CONSTRAINT ck_notifications_type_valid
    CHECK (type IN ('promo', 'launch', 'operational', 'content')),

  -- Conteúdo
  title        text NOT NULL
    CONSTRAINT ck_notifications_title_length
    CHECK (char_length(title) BETWEEN 1 AND 80),

  body         text NOT NULL
    CONSTRAINT ck_notifications_body_length
    CHECK (char_length(body) BETWEEN 1 AND 280),

  -- CTA opcional — ambos presentes ou ambos ausentes
  cta_label    text NULL
    CONSTRAINT ck_notifications_cta_label_length
    CHECK (cta_label IS NULL OR char_length(cta_label) BETWEEN 1 AND 40),

  cta_href     text NULL
    CONSTRAINT ck_notifications_cta_href_internal
    CHECK (cta_href IS NULL OR cta_href ~ '^/'),

  -- Público-alvo
  audience     text NOT NULL DEFAULT 'all'
    CONSTRAINT ck_notifications_audience_valid
    CHECK (audience IN ('all', 'authed')),

  -- Janela de visibilidade
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),

  -- Auditoria
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- CTA: ou ambos presentes ou ambos nulos
  CONSTRAINT ck_notifications_cta_both_or_none
    CHECK ((cta_label IS NULL) = (cta_href IS NULL)),

  -- expires_at deve ser posterior a published_at
  CONSTRAINT ck_notifications_expires_after_published
    CHECK (expires_at > published_at)
);

COMMENT ON TABLE public.notifications IS
  'Notificações broadcast da marca — promoções, lançamentos, operacional, conteúdo. '
  'Gerenciadas pelo admin via /gestao/notificacoes. Exibidas no sino do TopBar.';

COMMENT ON COLUMN public.notifications.type IS
  'Tipo: promo (promoção/desconto), launch (lançamento de produto), '
  'operational (aviso operacional ex: horário), content (conteúdo/receita).';
COMMENT ON COLUMN public.notifications.title IS
  'Título curto — máx 80 caracteres. Exibido em destaque no popover.';
COMMENT ON COLUMN public.notifications.body IS
  'Corpo da notificação — máx 280 caracteres. Truncado em 2 linhas no popover.';
COMMENT ON COLUMN public.notifications.cta_label IS
  'Rótulo do botão/link de ação. Obrigatório se cta_href presente. Máx 40 chars.';
COMMENT ON COLUMN public.notifications.cta_href IS
  'URL interna (começa com /) do CTA. Sem URLs externas por segurança.';
COMMENT ON COLUMN public.notifications.audience IS
  'all: visível para todos (incluindo anônimos). authed: só usuários logados.';
COMMENT ON COLUMN public.notifications.published_at IS
  'Quando a notificação começa a ser exibida. Default now() = imediato.';
COMMENT ON COLUMN public.notifications.expires_at IS
  'Quando a notificação deixa de aparecer. Default: 30 dias após criação.';
COMMENT ON COLUMN public.notifications.created_by IS
  'UUID do admin que criou a notificação. NULL para seeds/migrações.';

-- ── Índice de performance ───────────────────────────────────────────────────

-- Query mais comum: listar ativas ordenadas por published_at desc.
-- Partial index exclui expiradas — mantém o índice enxuto em produção.
CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON public.notifications (published_at DESC)
  WHERE expires_at > now();

-- ── Trigger updated_at ──────────────────────────────────────────────────────

-- Reutiliza extensions.moddatetime (disponível desde migration 01 via pg_extensions).
-- Padrão dos migrations existentes (vide coupons, products, etc.).
DROP TRIGGER IF EXISTS tg_notifications_touch_updated_at ON public.notifications;
CREATE TRIGGER tg_notifications_touch_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ── Tabela de leituras ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pk_notification_reads PRIMARY KEY (user_id, notification_id)
);

COMMENT ON TABLE public.notification_reads IS
  'Registro de quais notificações cada usuário já leu. '
  'Anônimos usam localStorage no client — não registram aqui.';
COMMENT ON COLUMN public.notification_reads.user_id IS
  'FK para auth.users. Cascade delete: apagado junto com o usuário.';
COMMENT ON COLUMN public.notification_reads.notification_id IS
  'FK para notifications. Cascade delete: apagado quando a notificação é removida.';
COMMENT ON COLUMN public.notification_reads.read_at IS
  'Timestamp da primeira leitura.';

-- ── Índice para queries de unread count ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notification_reads_user
  ON public.notification_reads (user_id, notification_id);

-- ── RLS — notifications ─────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT público: notificação ativa + audience correta.
-- Ativa = published_at <= now() AND expires_at > now().
-- Audience: 'all' vale para todos (auth.uid() pode ser null).
--            'authed' exige usuário logado.
DROP POLICY IF EXISTS "notifications_select_public" ON public.notifications;
CREATE POLICY "notifications_select_public" ON public.notifications
  FOR SELECT
  USING (
    published_at <= now()
    AND expires_at > now()
    AND (
      audience = 'all'
      OR (audience = 'authed' AND auth.uid() IS NOT NULL)
    )
  );

-- INSERT: só admin.
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: só admin.
DROP POLICY IF EXISTS "notifications_update_admin" ON public.notifications;
CREATE POLICY "notifications_update_admin" ON public.notifications
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: só admin (hard delete — a tabela não usa soft delete por design).
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;
CREATE POLICY "notifications_delete_admin" ON public.notifications
  FOR DELETE
  USING (public.is_admin());

-- Admin também precisa de SELECT irrestrito para o painel de gestão.
DROP POLICY IF EXISTS "notifications_select_admin" ON public.notifications;
CREATE POLICY "notifications_select_admin" ON public.notifications
  FOR SELECT
  USING (public.is_admin());

-- ── RLS — notification_reads ────────────────────────────────────────────────

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- SELECT: cada usuário vê apenas as próprias leituras.
DROP POLICY IF EXISTS "notification_reads_select_own" ON public.notification_reads;
CREATE POLICY "notification_reads_select_own" ON public.notification_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: usuário só insere para si mesmo.
DROP POLICY IF EXISTS "notification_reads_insert_own" ON public.notification_reads;
CREATE POLICY "notification_reads_insert_own" ON public.notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- DELETE: só admin (ex: limpeza de leituras de notificações removidas).
DROP POLICY IF EXISTS "notification_reads_delete_admin" ON public.notification_reads;
CREATE POLICY "notification_reads_delete_admin" ON public.notification_reads
  FOR DELETE
  USING (public.is_admin());

COMMIT;
