import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";
import type { Notification } from "@/types/notification";

// ── Row type (espelha schema da migration 16) ────────────────────────────────

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  audience: string;
  published_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

function notificationFromRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type as Notification["type"],
    title: row.title,
    body: row.body,
    ctaLabel: row.cta_label ?? undefined,
    ctaHref: row.cta_href ?? undefined,
    audience: row.audience as Notification["audience"],
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

// ── Queries públicas (usadas pelo hook useNotifications no client) ─────────────

/**
 * Lista notificações ativas para exibição no sino.
 *
 * - RLS filtra automaticamente por audience e janela de visibilidade.
 * - Se userId for fornecido, faz join com notification_reads para marcar lidas.
 * - Anônimos não têm userId — campo `read` fica undefined (lógica no client via localStorage).
 */
export async function listActiveNotifications(
  userId?: string,
): Promise<Notification[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[notifications/listActive]", error.message);
    return [];
  }

  if (!data?.length) return [];

  // Se autenticado, busca leituras do usuário para marcar no campo `read`
  if (userId) {
    const ids = data.map((n) => n.id);
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .in("notification_id", ids);

    const readSet = new Set((reads ?? []).map((r) => r.notification_id));

    return data.map((row) => ({
      ...notificationFromRow(row as NotificationRow),
      read: readSet.has(row.id),
    }));
  }

  return data.map((row) => notificationFromRow(row as NotificationRow));
}

// ── Queries admin (listagem completa para /gestao/notificacoes) ───────────────

/**
 * Lista TODAS as notificações para o painel admin — sem filtro de RLS de janela,
 * pois admin usa policy separada (`notifications_select_admin`).
 */
export async function listAdminNotifications(): Promise<Notification[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[notifications/listAdmin]", error.message);
    return [];
  }

  return (data ?? []).map((row) => notificationFromRow(row as NotificationRow));
}

/**
 * Busca notificação por ID — para a rota de edição `/gestao/notificacoes/[id]`.
 */
export async function getNotificationById(id: string): Promise<Notification | null> {
  if (!id) return null;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[notifications/getById]", error.message);
    return null;
  }

  if (!data) return null;
  return notificationFromRow(data as NotificationRow);
}
