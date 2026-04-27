"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/server/supabase/server";
import { addressFromRow } from "@/server/supabase/mappers";
import type { Address } from "@/stores/address-store";

export type AddressActionResult =
  | { ok: true; address: Address }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export type RemoveAddressResult = { ok: true } | { ok: false; message: string };

const addressInputSchema = z.object({
  nickname: z
    .string({ error: "Apelido obrigatório." })
    .trim()
    .min(1, "Apelido obrigatório.")
    .max(80, "Apelido muito longo."),
  street: z
    .string({ error: "Logradouro obrigatório." })
    .trim()
    .min(1, "Logradouro obrigatório.")
    .max(200, "Logradouro muito longo."),
  number: z
    .string({ error: "Número obrigatório." })
    .trim()
    .min(1, "Número obrigatório.")
    .max(20, "Número muito longo."),
  complement: z.string().trim().max(120, "Complemento muito longo.").optional().or(z.literal("")),
  neighborhood: z
    .string({ error: "Bairro obrigatório." })
    .trim()
    .min(1, "Bairro obrigatório.")
    .max(120, "Bairro muito longo."),
  city: z
    .string({ error: "Cidade obrigatória." })
    .trim()
    .min(1, "Cidade obrigatória.")
    .max(120, "Cidade muito longa."),
  state: z
    .string({ error: "UF obrigatória." })
    .trim()
    .length(2, "UF tem que ter 2 letras."),
  cep: z
    .string({ error: "CEP obrigatório." })
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido."),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

const ROW_COLUMNS =
  "id,profile_id,label,street,number,complement,neighborhood,city,state,cep,lat,lng,is_default,deleted_at";

export async function createAddressAction(input: AddressInput): Promise<AddressActionResult> {
  const parsed = addressInputSchema.safeParse(input);
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

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  // Primeiro endereço vira default automático. Demais ficam não-default a não ser
  // que o usuário marque explicitamente.
  const { count } = await supabase
    .from("user_addresses")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  const wantsDefault = parsed.data.isDefault ?? (count ?? 0) === 0;

  // Garante UNIQUE (apenas 1 default por profile): zera os outros antes do insert.
  if (wantsDefault) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("profile_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("user_addresses")
    .insert({
      profile_id: user.id,
      label: parsed.data.nickname,
      street: parsed.data.street,
      number: parsed.data.number,
      complement: parsed.data.complement || null,
      neighborhood: parsed.data.neighborhood,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      cep: parsed.data.cep,
      is_default: wantsDefault,
    })
    .select(ROW_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[address-actions] create:", error?.message);
    return { ok: false, message: "Não foi possível salvar o endereço." };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    address: addressFromRow(data as Parameters<typeof addressFromRow>[0]),
  };
}

export async function updateAddressAction(
  id: string,
  input: AddressInput,
): Promise<AddressActionResult> {
  const parsed = addressInputSchema.safeParse(input);
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

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  if (parsed.data.isDefault) {
    await supabase
      .from("user_addresses")
      .update({ is_default: false })
      .eq("profile_id", user.id)
      .eq("is_default", true)
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("user_addresses")
    .update({
      label: parsed.data.nickname,
      street: parsed.data.street,
      number: parsed.data.number,
      complement: parsed.data.complement || null,
      neighborhood: parsed.data.neighborhood,
      city: parsed.data.city,
      state: parsed.data.state.toUpperCase(),
      cep: parsed.data.cep,
      ...(parsed.data.isDefault !== undefined ? { is_default: parsed.data.isDefault } : {}),
    })
    .eq("id", id)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .select(ROW_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[address-actions] update:", error?.message);
    return { ok: false, message: "Não foi possível atualizar o endereço." };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    address: addressFromRow(data as Parameters<typeof addressFromRow>[0]),
  };
}

/**
 * Soft-delete: marca `deleted_at = now()`. Hard-delete não é proibido por
 * trigger, mas preserva auditoria — pedidos antigos podem referenciar o
 * endereço via shipping_address_snapshot. Soft-delete + filtro `deleted_at IS
 * NULL` em todas as queries garante consistência.
 */
export async function removeAddressAction(id: string): Promise<RemoveAddressResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("user_addresses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[address-actions] remove:", error.message);
    return { ok: false, message: "Não foi possível remover o endereço." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setDefaultAddressAction(id: string): Promise<RemoveAddressResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  // Zera default antigo, marca novo default.
  await supabase
    .from("user_addresses")
    .update({ is_default: false })
    .eq("profile_id", user.id)
    .eq("is_default", true);

  const { error } = await supabase
    .from("user_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("profile_id", user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[address-actions] setDefault:", error.message);
    return { ok: false, message: "Não foi possível definir o endereço principal." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
