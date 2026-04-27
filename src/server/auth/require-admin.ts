import "server-only";

import { createSupabaseServerClient } from "@/server/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type RequireAdminResult =
  | { supabase: SupabaseServer; error: null }
  | { supabase: SupabaseServer; error: string };

/**
 * Garante que a request veio de um usuário autenticado com role=admin.
 * Retorna o cliente Supabase para reuso (evita criar segundo cliente).
 *
 * Uso em server actions:
 *   const { supabase, error } = await requireAdmin();
 *   if (error) return { ok: false, message: error };
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, error: "Sessão expirada. Faça login novamente." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { supabase, error: "Acesso restrito ao administrador." };
  }

  return { supabase, error: null };
}
