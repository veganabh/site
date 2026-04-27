import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/signup-form";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8 md:py-12">
      <SignUpForm />
    </main>
  );
}
