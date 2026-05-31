import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { createSupabaseServerClient } from "@/server/supabase/server";

export const metadata: Metadata = {
  title: "Entrar — Veg.ana",
  description: "Acesse sua conta Veg.ana pra acompanhar pedidos e fechar mais rápido.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { next } = await searchParams;

  if (user) {
    redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/conta");
  }

  return <AuthCard defaultTab="signin" next={next} />;
}
