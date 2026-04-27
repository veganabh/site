import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/server/supabase/server";

/**
 * Guard server-side de `/conta/**`. Anônimo é redirecionado pra
 * `/login?next=/conta` antes do RSC renderizar — evita flash de
 * "loading" do AuthProvider client e impede que dados sensíveis
 * passem pelo wire em race conditions.
 *
 * Roda em todo segmento sob `/conta/*` (perfil, presentes, etc.).
 */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/conta");
  }

  return <>{children}</>;
}
