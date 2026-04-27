import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/db";

/**
 * Server-side Supabase client (RSC, Route Handlers, Server Actions).
 * Lê/escreve cookies do Next.js para propagar sessão Supabase.
 * Respeita RLS via anon key + JWT do usuário logado.
 *
 * Next.js 16: `cookies()` retorna `Promise<ReadonlyRequestCookies>` — await.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // RSC não pode setar cookies — middleware lida com refresh de sessão.
        }
      },
    },
  });
}
