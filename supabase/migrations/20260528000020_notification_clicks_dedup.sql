-- Migration 20 — Dedup de cliques por usuário
--
-- Antes: notification_clicks sem unique → mesmo usuário clicando N vezes
-- gerava N linhas. Agora: 1 clique por (notification_id, profile_id).
--
-- NULL é distinto em UNIQUE no Postgres → cliques anônimos (profile_id NULL)
-- continuam contados individualmente (não há identidade pra deduplicar).
-- Cliques de usuário logado deduplicam.

-- 1. Remove duplicatas existentes de usuários logados (mantém a mais antiga).
DELETE FROM public.notification_clicks a
USING public.notification_clicks b
WHERE a.profile_id IS NOT NULL
  AND a.profile_id = b.profile_id
  AND a.notification_id = b.notification_id
  AND a.ctid > b.ctid;

-- 2. Constraint de unicidade (NULLs ficam distintos = anon não deduplica).
ALTER TABLE public.notification_clicks
  ADD CONSTRAINT uq_notification_clicks_notif_profile UNIQUE (notification_id, profile_id);
