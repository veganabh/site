import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8 md:py-12">
      <LoginForm next={next} />
    </main>
  );
}
