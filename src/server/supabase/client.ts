import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/db";

/**
 * Client-side Supabase (Client Components).
 * Usa anon key + cookies via @supabase/ssr.
 * Respeita RLS — nunca expõe service_role.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
