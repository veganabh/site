import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Atribuição notificação → compra. Um clique de CTA (cliente logado) "converte"
 * se o mesmo profile fez um pedido na janela pós-clique (default 7 dias).
 *
 * Só logado: clique anônimo (anon_id) não liga a pedido (sem identidade).
 * SELECT em clicks exige admin (RLS) — roda na página admin.
 */

const WINDOW_DAYS = 7;
const centsToReais = (c: number) => Math.round(c) / 100;

export type NotifAttributionRow = {
  notificationId: string;
  title: string;
  /** Cliques de clientes logados (atribuíveis). */
  clicks: number;
  /** Cliques que tiveram pedido na janela pós-clique. */
  conversions: number;
  /** Receita dos pedidos atribuídos (R$). */
  attributedRevenue: number;
  /** conversions / clicks (0..1). null se sem cliques. */
  convRate: number | null;
};

export type NotifAttribution = {
  windowDays: number;
  rows: NotifAttributionRow[];
  totalClicks: number;
  totalConversions: number;
  totalAttributedRevenue: number;
  overallConvRate: number | null;
};

export async function getNotificationAttribution(): Promise<NotifAttribution> {
  const supabase = await createSupabaseServerClient();

  const [clicksRes, ordersRes, notifsRes] = await Promise.all([
    supabase
      .from("notification_clicks")
      .select("notification_id, profile_id, clicked_at")
      .not("profile_id", "is", null),
    supabase
      .from("orders")
      .select("profile_id, created_at, total_cents, status")
      .not("profile_id", "is", null)
      .neq("status", "CANCELADO"),
    supabase.from("notifications").select("id, title"),
  ]);

  const clicks = clicksRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const titleById = new Map((notifsRes.data ?? []).map((n) => [n.id, n.title]));

  // Pedidos por profile, ordenados por data.
  const ordersByProfile = new Map<string, { at: number; cents: number }[]>();
  for (const o of orders) {
    if (!o.profile_id) continue;
    const list = ordersByProfile.get(o.profile_id) ?? [];
    list.push({ at: new Date(o.created_at).getTime(), cents: o.total_cents });
    ordersByProfile.set(o.profile_id, list);
  }
  for (const list of ordersByProfile.values()) list.sort((a, b) => a.at - b.at);

  const windowMs = WINDOW_DAYS * 86_400_000;

  type Agg = { clicks: number; conversions: number; revenueCents: number };
  const byNotif = new Map<string, Agg>();

  for (const c of clicks) {
    if (!c.profile_id) continue;
    const agg = byNotif.get(c.notification_id) ?? { clicks: 0, conversions: 0, revenueCents: 0 };
    agg.clicks += 1;

    const clickAt = new Date(c.clicked_at).getTime();
    const profileOrders = ordersByProfile.get(c.profile_id) ?? [];
    // Primeiro pedido na janela (clickAt, clickAt + window].
    const firstInWindow = profileOrders.find((o) => o.at > clickAt && o.at <= clickAt + windowMs);
    if (firstInWindow) {
      agg.conversions += 1;
      agg.revenueCents += firstInWindow.cents;
    }
    byNotif.set(c.notification_id, agg);
  }

  const rows: NotifAttributionRow[] = Array.from(byNotif.entries())
    .map(([notificationId, a]) => ({
      notificationId,
      title: titleById.get(notificationId) ?? "(removida)",
      clicks: a.clicks,
      conversions: a.conversions,
      attributedRevenue: centsToReais(a.revenueCents),
      convRate: a.clicks > 0 ? a.conversions / a.clicks : null,
    }))
    .sort((a, b) => b.attributedRevenue - a.attributedRevenue);

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0);
  const totalAttributedRevenue = rows.reduce((s, r) => s + r.attributedRevenue, 0);

  return {
    windowDays: WINDOW_DAYS,
    rows,
    totalClicks,
    totalConversions,
    totalAttributedRevenue,
    overallConvRate: totalClicks > 0 ? totalConversions / totalClicks : null,
  };
}
