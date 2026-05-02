import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { listActiveNotifications } from "@/server/notifications";

/**
 * GET /api/notifications
 *
 * Retorna notificações ativas com campo `read` populado se o usuário
 * estiver autenticado. Anônimos recebem `read: undefined` e gerenciam
 * o estado de leitura localmente via localStorage.
 *
 * Cache desativado — sempre busca estado atual (P0 sem realtime).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const notifications = await listActiveNotifications(user?.id);

    return NextResponse.json(notifications, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/notifications]", err);
    return NextResponse.json([], { status: 200 }); // falha silenciosa — sino vazio
  }
}
