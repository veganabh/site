/**
 * Layout do route group (gestao).
 *
 * Gate em duas camadas:
 * 1. **Server** (este arquivo): valida `role = 'admin'` via Supabase. Não-admin
 *    NUNCA recebe HTML da área de gestão — redireciona pra /login ou /.
 * 2. **Client** (AdminGate): reforça caso a hidratação venha stale.
 *
 * AdminShell é o chrome próprio da área admin — sem sidebar de cliente,
 * sem BottomNav, sem MiniCartBar.
 */
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminGate } from "@/components/features/admin-gate";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function GestaoGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <AdminShell>
      <AdminGate>{children}</AdminGate>
    </AdminShell>
  );
}
