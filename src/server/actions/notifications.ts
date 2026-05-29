"use server";

import { revalidatePath } from "next/cache";

import { notificationInputSchema } from "@/lib/notifications/schema";
import { requireAdmin } from "@/server/auth/require-admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { NotificationInput } from "@/types/notification";

export type NotificationActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

// ── Create ────────────────────────────────────────────────────────────────────

export async function createNotificationAction(
  input: NotificationInput,
): Promise<NotificationActionResult<{ id: string }>> {
  const parsed = notificationInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const d = parsed.data;
  const { data: inserted, error } = await supabase
    .from("notifications")
    .insert({
      type: d.type,
      title: d.title,
      body: d.body,
      cta_label: d.ctaLabel ?? null,
      cta_href: d.ctaHref ?? null,
      coupon_code: d.couponCode ?? null,
      audience: d.audience,
      published_at: d.publishedAt,
      expires_at: d.expiresAt,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notifications/create]", error.message);
    return { ok: false, message: "Não foi possível criar a notificação." };
  }

  revalidatePath("/gestao/notificacoes");
  return { ok: true, data: { id: inserted.id } };
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateNotificationAction(
  id: string,
  input: NotificationInput,
): Promise<NotificationActionResult> {
  if (!id) return { ok: false, message: "ID da notificação ausente." };

  const parsed = notificationInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const d = parsed.data;
  const { error } = await supabase
    .from("notifications")
    .update({
      type: d.type,
      title: d.title,
      body: d.body,
      cta_label: d.ctaLabel ?? null,
      cta_href: d.ctaHref ?? null,
      coupon_code: d.couponCode ?? null,
      audience: d.audience,
      published_at: d.publishedAt,
      expires_at: d.expiresAt,
    })
    .eq("id", id);

  if (error) {
    console.error("[notifications/update]", error.message);
    return { ok: false, message: "Não foi possível salvar." };
  }

  revalidatePath("/gestao/notificacoes");
  revalidatePath(`/gestao/notificacoes/${id}`);
  return { ok: true };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteNotificationAction(id: string): Promise<NotificationActionResult> {
  if (!id) return { ok: false, message: "ID da notificação ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    console.error("[notifications/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir." };
  }

  revalidatePath("/gestao/notificacoes");
  return { ok: true };
}

// ── Mark read (usuário autenticado) ───────────────────────────────────────────

export async function markNotificationReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  if (!notificationId) return { ok: false, message: "ID ausente." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada." };

  // upsert ignora conflito se já existe (PK duplicada)
  const { error } = await supabase.from("notification_reads").upsert(
    { user_id: user.id, notification_id: notificationId },
    { onConflict: "user_id,notification_id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("[notifications/markRead]", error.message);
    return { ok: false, message: "Não foi possível marcar como lida." };
  }

  return { ok: true };
}

// ── Mark all read ─────────────────────────────────────────────────────────────

export async function markAllNotificationsReadAction(
  notificationIds: string[],
): Promise<NotificationActionResult> {
  if (!notificationIds.length) return { ok: true };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada." };

  const rows = notificationIds.map((notification_id) => ({
    user_id: user.id,
    notification_id,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "user_id,notification_id", ignoreDuplicates: true });

  if (error) {
    console.error("[notifications/markAllRead]", error.message);
    return { ok: false, message: "Não foi possível marcar todas como lidas." };
  }

  return { ok: true };
}

// ── Track CTA click (métrica) ──────────────────────────────────────────────
//
// Chamado pelo sino quando o cliente clica no CTA. Fire-and-forget: falha não
// bloqueia a navegação. Anônimo → profile_id NULL (RLS permite). Logado →
// seu próprio uid. Não exige admin (qualquer visitante registra o próprio).

export async function trackNotificationClickAction(
  notificationId: string,
  anonId?: string,
): Promise<void> {
  if (!notificationId) return;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Logado: dedup por profile_id (upsert ignore).
      await supabase
        .from("notification_clicks")
        .upsert(
          { notification_id: notificationId, profile_id: user.id },
          { onConflict: "notification_id,profile_id", ignoreDuplicates: true },
        );
    } else if (anonId) {
      // Anônimo: dedup por anon_id de dispositivo. O índice único parcial
      // (notification_id, anon_id) rejeita duplicata — 23505 é esperado e ignorado.
      const { error } = await supabase
        .from("notification_clicks")
        .insert({ notification_id: notificationId, anon_id: anonId });
      if (error && error.code !== "23505") {
        console.error("[notifications/trackClick/anon]", error.message);
      }
    }
  } catch (err) {
    console.error("[notifications/trackClick]", err);
  }
}

// ── Mark read anônimo (por anon_id de dispositivo) ─────────────────────────────

export async function markAnonNotificationReadAction(
  notificationIds: string[],
  anonId: string,
): Promise<void> {
  if (!anonId || !notificationIds.length) return;
  try {
    const supabase = await createSupabaseServerClient();
    const rows = notificationIds.map((notification_id) => ({
      notification_id,
      anon_id: anonId,
    }));
    await supabase
      .from("notification_anon_reads")
      .upsert(rows, { onConflict: "notification_id,anon_id", ignoreDuplicates: true });
  } catch (err) {
    console.error("[notifications/markAnonRead]", err);
  }
}
