"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/server/supabase/server";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

/**
 * Valida CPF (Cadastro de Pessoa Física) brasileiro.
 * Aceita string com ou sem máscara — checa se 11 dígitos passam no algoritmo
 * dos dígitos verificadores. Rejeita sequências repetidas ("00000000000").
 */
function isValidCpf(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digits = d.split("").map(Number);
  const calc = (slice: number[], factor: number) =>
    slice.reduce((sum, n, i) => sum + n * (factor - i), 0);

  const dv1 = (calc(digits.slice(0, 9), 10) * 10) % 11 % 10;
  const dv2 = (calc(digits.slice(0, 10), 11) * 10) % 11 % 10;

  return dv1 === digits[9] && dv2 === digits[10];
}

const updateProfileSchema = z.object({
  firstName: z
    .string({ error: "Nome é obrigatório." })
    .trim()
    .min(2, "Nome muito curto.")
    .max(80, "Nome muito longo."),
  lastName: z
    .string()
    .trim()
    .max(80, "Sobrenome muito longo.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
  cpf: z
    .string()
    .trim()
    .max(20, "CPF muito longo.")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCpf(v), "CPF inválido."),
});

/**
 * Atualiza profile do usuário logado. Email é gerenciado pelo Supabase
 * Auth — não toca aqui (precisa flow próprio com confirmação).
 */
export async function updateProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const parsed = updateProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    phone: formData.get("phone") ?? "",
    cpf: formData.get("cpf") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const cpfDigits = parsed.data.cpf ? parsed.data.cpf.replace(/\D/g, "") : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName || null,
      phone: parsed.data.phone || null,
      cpf: cpfDigits || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/conta", "layout");
  return { ok: true };
}
