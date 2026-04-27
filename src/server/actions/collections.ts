"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import { COLLECTION_ICON_NAMES } from "@/lib/collection-icons";
import type { Database } from "@/types/db";

type CollectionUpdate = Database["public"]["Tables"]["collections"]["Update"];

/**
 * CRUD admin de coleções. Server-only, gate por role=admin via RLS — esta
 * camada valida input com Zod e dispara revalidatePath("/", "layout") pra
 * que o root layout re-fetche e o CollectionsStoreHydrator empurre a lista
 * atualizada nos consumidores client.
 */

export type CollectionActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_RE = /^\/[a-z0-9/-]*$/;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const baseCollectionSchema = z.object({
  name: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(80),
  tagline: z.string().trim().max(200).default(""),
  iconName: z.enum(COLLECTION_ICON_NAMES),
  routePath: z
    .string()
    .trim()
    .regex(ROUTE_RE, "Rota inválida — comece com /, sem espaços ou maiúsculas.")
    .max(120)
    .nullable()
    .optional(),
  sortOrder: z.coerce.number().int().nonnegative("Ordem precisa ser >= 0.").default(0),
  active: z.boolean().default(true),
});

const createCollectionSchema = baseCollectionSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(SLUG_RE, "Slug inválido — letras minúsculas, números e hífens.")
    .min(2)
    .max(60)
    .optional(),
});

const updateCollectionSchema = baseCollectionSchema.partial().extend({
  slug: z.string().trim().regex(SLUG_RE).min(2).max(60).optional(),
});

const productIdsSchema = z.array(z.string().uuid("ID de produto inválido."));

type CreateCollectionInput = z.input<typeof createCollectionSchema>;
type UpdateCollectionInput = z.input<typeof updateCollectionSchema>;

// ── Create ──────────────────────────────────────────────────────────────────

export async function createCollectionAction(
  input: CreateCollectionInput,
): Promise<CollectionActionResult<{ id: string }>> {
  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const data = parsed.data;
  const slug = data.slug?.trim() || toSlug(data.name);
  if (slug.length < 2) {
    return { ok: false, message: "Slug inválido — escolha um nome com letras." };
  }

  const { data: inserted, error } = await supabase
    .from("collections")
    .insert({
      slug,
      name: data.name,
      tagline: data.tagline,
      icon_name: data.iconName,
      route_path: data.routePath ?? null,
      sort_order: data.sortOrder,
      active: data.active,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `Já existe coleção com slug "${slug}".` };
    }
    console.error("[collections/create]", error.message);
    return { ok: false, message: "Não foi possível criar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id: inserted.id } };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateCollectionAction(
  id: string,
  input: UpdateCollectionInput,
): Promise<CollectionActionResult> {
  if (!id) return { ok: false, message: "ID da coleção ausente." };

  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os campos do formulário.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const data = parsed.data;
  const patch: CollectionUpdate = {};
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.name !== undefined) patch.name = data.name;
  if (data.tagline !== undefined) patch.tagline = data.tagline;
  if (data.iconName !== undefined) patch.icon_name = data.iconName;
  if (data.routePath !== undefined) patch.route_path = data.routePath;
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
  if (data.active !== undefined) patch.active = data.active;

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase.from("collections").update(patch).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Slug já em uso. Escolha outro." };
    }
    console.error("[collections/update]", error.message);
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Delete (soft) ───────────────────────────────────────────────────────────

export async function deleteCollectionAction(id: string): Promise<CollectionActionResult> {
  if (!id) return { ok: false, message: "ID da coleção ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("collections")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", id);

  if (error) {
    console.error("[collections/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Toggle active ───────────────────────────────────────────────────────────

export async function toggleActiveCollectionAction(
  id: string,
  active: boolean,
): Promise<CollectionActionResult> {
  if (!id) return { ok: false, message: "ID da coleção ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase.from("collections").update({ active }).eq("id", id);
  if (error) {
    console.error("[collections/toggleActive]", error.message);
    return { ok: false, message: "Não foi possível alterar visibilidade." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Set products (replace-all curadoria) ────────────────────────────────────

export async function setCollectionProductsAction(
  id: string,
  productIds: string[],
): Promise<CollectionActionResult> {
  if (!id) return { ok: false, message: "ID da coleção ausente." };

  const parsed = productIdsSchema.safeParse(productIds);
  if (!parsed.success) {
    return { ok: false, message: "Lista de produtos inválida." };
  }

  // Dedup preservando ordem (curadoria escrita pelo admin é a fonte da verdade).
  const seen = new Set<string>();
  const unique = parsed.data.filter((pid) => (seen.has(pid) ? false : (seen.add(pid), true)));

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("collections")
    .update({ product_ids: unique })
    .eq("id", id);

  if (error) {
    console.error("[collections/setProducts]", error.message);
    return { ok: false, message: "Não foi possível atualizar a curadoria." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
