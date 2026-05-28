"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";

export type CategoryActionResult =
  | { ok: true }
  | { ok: false; message: string };

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const nameSchema = z.string().trim().min(2, "Nome muito curto.").max(40, "Nome muito longo.");

// ── Create ────────────────────────────────────────────────────────────────────

export async function createCategoryAction(input: {
  name: string;
}): Promise<CategoryActionResult> {
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const slug = toSlug(parsed.data);
  if (!slug) return { ok: false, message: "Nome inválido para gerar identificador." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  // sort_order = fim da lista
  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("categories")
    .insert({ slug, name: parsed.data, sort_order: nextOrder });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Já existe uma categoria com esse nome." };
    }
    console.error("[categories/create]", error.message);
    return { ok: false, message: "Não foi possível criar a categoria." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Update (nome e/ou ativo) ───────────────────────────────────────────────────

const updateSchema = z.object({
  id: z.string().min(1),
  name: nameSchema.optional(),
  active: z.boolean().optional(),
});

export async function updateCategoryAction(input: {
  id: string;
  name?: string;
  active?: boolean;
}): Promise<CategoryActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const patch: { name?: string; active?: boolean } = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;

  if (Object.keys(patch).length === 0) return { ok: true };

  // Nome muda mas slug NÃO — slug é o link estável com products.category.
  const { error } = await supabase.from("categories").update(patch).eq("id", parsed.data.id);

  if (error) {
    console.error("[categories/update]", error.message);
    return { ok: false, message: "Não foi possível atualizar a categoria." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Delete (hard-delete, reset livre) ──────────────────────────────────────────

export async function deleteCategoryAction(id: string): Promise<CategoryActionResult> {
  if (!id) return { ok: false, message: "ID ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("[categories/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir a categoria." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Reorder ─────────────────────────────────────────────────────────────────

const reorderSchema = z.array(z.string().min(1)).min(1);

export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<CategoryActionResult> {
  const parsed = reorderSchema.safeParse(orderedIds);
  if (!parsed.success) return { ok: false, message: "Ordem inválida." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const updates = parsed.data.map((id, index) =>
    supabase.from("categories").update({ sort_order: index + 1 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[categories/reorder]", failed.error.message);
    return { ok: false, message: "Não foi possível reordenar." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
