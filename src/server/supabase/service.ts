import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db";

/**
 * Service-role Supabase client. **BYPASSA RLS.**
 *
 * Use APENAS em:
 * - Webhooks externos (AbacatePay, WhatsApp) que precisam escrever sem usuário.
 * - Server actions de admin isoladas com check de `is_admin()` antes.
 * - Scripts de seed/migration.
 *
 * NUNCA importar de Client Component. NUNCA expor a chave ao navegador.
 * Next.js trata `import "server-only"` como barreira — build falha se vazar.
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
