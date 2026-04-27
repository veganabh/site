"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/server/supabase/server";

import { signInSchema, signUpSchema } from "./schema";

export type AuthActionResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Cadastro com email + senha. Trigger `handle_new_user` cria row em
 * `public.profiles` com `first_name`, `last_name`, `phone` vindos de
 * `raw_user_meta_data`. Confirmação por email pode estar ON no Supabase —
 * neste caso o usuário NÃO fica autenticado direto e precisa clicar no link.
 */
export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName ?? "",
        phone: parsed.data.phone ?? "",
      },
    },
  });

  if (error) {
    return { ok: false, message: translateAuthError(error.message) };
  }

  // Quando email confirmation está OFF no Supabase, signUp já retorna sessão
  // ativa e cookies foram setados. Quando ON, `data.session` vem null e o
  // usuário precisa clicar no link do email antes de logar.
  const needsEmailConfirmation = !data.session;

  revalidatePath("/", "layout");

  if (!needsEmailConfirmation) {
    redirect("/conta");
  }

  return { ok: true, needsEmailConfirmation: true };
}

/**
 * Login com email + senha. Em sucesso, redireciona pra `?next` (se for
 * path relativo seguro) ou `/conta`. Erro propaga string traduzida.
 */
export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");

  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" ? sanitizeNext(nextRaw) : "/conta";
  redirect(next);
}

/**
 * Aceita apenas paths relativos (`/foo`) e nunca `//foo` ou URLs absolutas
 * — evita open redirect via `?next=https://atacante.com`.
 */
function sanitizeNext(value: string): string {
  if (!value.startsWith("/")) return "/conta";
  if (value.startsWith("//")) return "/conta";
  return value;
}

/**
 * Encerra a sessão. Limpa cookies e revalida o app inteiro.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered") || m.includes("user already")) {
    return "Este email já está cadastrado.";
  }
  if (m.includes("weak password")) return "Senha muito fraca.";
  if (m.includes("rate limit")) return "Muitas tentativas. Tente novamente em alguns minutos.";
  return "Não foi possível concluir. Tente novamente.";
}
