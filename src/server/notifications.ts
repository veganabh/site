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
  coupon_code: string | null;
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
    couponCode: row.coupon_code ?? null,
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

// ── Métricas (admin) ──────────────────────────────────────────────────────────

export type NotificationStats = {
  reads: number;
  clicks: number;
  /** clicks / reads em 0..1. null quando reads = 0. */
  ctr: number | null;
};

export type NotificationMetrics = {
  totalNotifications: number;
  totalReads: number;
  totalClicks: number;
  /** Razão geral cliques/leituras (0..1). null se sem leituras. */
  overallCtr: number | null;
  /** Stats por notificationId. */
  byId: Record<string, NotificationStats>;
  /** ID da notificação mais lida (ou null). */
  mostReadId: string | null;
};

function countByNotification(rows: { notification_id: string }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows ?? []) map.set(r.notification_id, (map.get(r.notification_id) ?? 0) + 1);
  return map;
}

/**
 * Agrega leituras + cliques por notificação. SELECT exige role admin
 * (policies notification_reads_select_admin / notification_clicks_select_admin).
 * Volume baixo → conta em JS, sem RPC de group by.
 */
export async function getNotificationMetrics(): Promise<NotificationMetrics> {
  const supabase = await createSupabaseServerClient();

  const [readsRes, anonReadsRes, clicksRes, notifCountRes] = await Promise.all([
    supabase.from("notification_reads").select("notification_id"),
    supabase.from("notification_anon_reads").select("notification_id"),
    supabase.from("notification_clicks").select("notification_id"),
    supabase.from("notifications").select("*", { count: "exact", head: true }),
  ]);

  // Leituras = logado (notification_reads) + anônimo (notification_anon_reads).
  const allReads = [...(readsRes.data ?? []), ...(anonReadsRes.data ?? [])];
  const readsBy = countByNotification(allReads);
  const clicksBy = countByNotification(clicksRes.data);

  const totalReads = allReads.length;
  const totalClicks = clicksRes.data?.length ?? 0;
  const totalNotifications = notifCountRes.count ?? 0;

  const ids = new Set<string>([...readsBy.keys(), ...clicksBy.keys()]);
  const byId: Record<string, NotificationStats> = {};
  let mostReadId: string | null = null;
  let mostReadCount = 0;

  for (const id of ids) {
    const reads = readsBy.get(id) ?? 0;
    const clicks = clicksBy.get(id) ?? 0;
    byId[id] = { reads, clicks, ctr: reads > 0 ? clicks / reads : null };
    if (reads > mostReadCount) {
      mostReadCount = reads;
      mostReadId = id;
    }
  }

  return {
    totalNotifications,
    totalReads,
    totalClicks,
    overallCtr: totalReads > 0 ? totalClicks / totalReads : null,
    byId,
    mostReadId,
  };
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
