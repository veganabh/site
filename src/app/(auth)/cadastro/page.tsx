import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const metadata: Metadata = {
  title: "Criar conta — Veg.ana",
  description: "Crie sua conta Veg.ana pra acompanhar pedidos e fechar mais rápido.",
};

export default async function CadastroPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/conta");
  }

  return <AuthCard defaultTab="signup" />;
}
