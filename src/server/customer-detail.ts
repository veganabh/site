import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Detalhe de cliente para /gestao/clientes/[phone]. Log de engajamento em
 * notificações é por profile_id (só cliente logado). Liga telefone → profile.
 * SELECT em reads/clicks exige admin (RLS) — a página roda como admin.
 */

export type NotificationLogEntry = {
  notificationId: string;
  title: string;
  type: string;
  /** ISO — quando abriu (leu). null se nunca leu. */
  readAt: string | null;
  /** ISO — quando clicou no CTA. null se nunca clicou. */
  clickedAt: string | null;
};

/** profile_id do cliente a partir do telefone (null se não tem conta). */
export async function getProfileIdByPhone(phone: string): Promise<string | null> {
  if (!phone) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Log de notificações do cliente logado: o que abriu (leu) e o que clicou,
 * com título e tipo. Ordenado pela atividade mais recente.
 */
export async function getCustomerNotificationLog(
  profileId: string,
): Promise<NotificationLogEntry[]> {
  if (!profileId) return [];
  const supabase = await createSupabaseServerClient();

  const [readsRes, clicksRes] = await Promise.all([
    supabase.from("notification_reads").select("notification_id, read_at").eq("user_id", profileId),
    supabase
      .from("notification_clicks")
      .select("notification_id, clicked_at")
      .eq("profile_id", profileId),
  ]);

  const readBy = new Map<string, string>();
  for (const r of readsRes.data ?? []) readBy.set(r.notification_id, r.read_at);
  const clickBy = new Map<string, string>();
  for (const c of clicksRes.data ?? []) clickBy.set(c.notification_id, c.clicked_at);

  const ids = Array.from(new Set([...readBy.keys(), ...clickBy.keys()]));
  if (ids.length === 0) return [];

  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, title, type")
    .in("id", ids);

  const metaById = new Map((notifs ?? []).map((n) => [n.id, n]));

  const log: NotificationLogEntry[] = ids.map((id) => {
    const meta = metaById.get(id);
    return {
      notificationId: id,
      title: meta?.title ?? "(removida)",
      type: meta?.type ?? "—",
      readAt: readBy.get(id) ?? null,
      clickedAt: clickBy.get(id) ?? null,
    };
  });

  // Atividade mais recente primeiro (clique > leitura)
  log.sort((a, b) => {
    const ta = new Date(a.clickedAt ?? a.readAt ?? 0).getTime();
    const tb = new Date(b.clickedAt ?? b.readAt ?? 0).getTime();
    return tb - ta;
  });

  return log;
}
