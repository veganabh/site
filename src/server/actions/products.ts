"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import type { Database } from "@/types/db";
import {
  PRODUCT_ATTRIBUTES,
  PRODUCT_CATEGORIES,
  PRODUCT_CONTAINS,
  PRODUCT_TAGS,
} from "@/types/product";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

/**
 * CRUD de produtos. Server-only, gate por role=admin via RLS — esta camada
 * só valida input, mapeia camelCase→snake_case e dispara revalidatePath
 * pra que o root layout re-fetche produtos e o MenuStoreHydrator empurre
 * a lista atualizada nos consumidores client.
 *
 * Reais → centavos é convertido aqui (DB armazena cents).
 */

export type ProductActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const reaisToCents = (reais: number): number => Math.round(reais * 100);

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const baseProductSchema = z.object({
  name: z.string().trim().min(2, "Nome precisa ter pelo menos 2 caracteres.").max(120),
  description: z.string().trim().min(10, "Descrição muito curta.").max(2000),
  category: z.enum(PRODUCT_CATEGORIES),
  gramatura_g: z.coerce.number().int().positive("Informe a gramatura."),
  price_site: z.coerce.number().positive("Preço site inválido."),
  price_ifood: z.coerce.number().positive("Preço iFood inválido."),
  attributes: z.array(z.enum(PRODUCT_ATTRIBUTES)).default([]),
  tags: z.array(z.enum(PRODUCT_TAGS)).default([]),
  contains: z.array(z.enum(PRODUCT_CONTAINS)).default([]),
  photo_url: z.string().trim().max(500).default(""),
  photo_alt: z.string().trim().max(200).default(""),
  active: z.boolean().default(true),
  stock: z.coerce.number().int().nonnegative("Estoque não pode ser negativo.").default(0),
  lowStockThreshold: z.coerce.number().int().positive("Alerta precisa ser >= 1.").default(3),
});

const createProductSchema = baseProductSchema.extend({
  slug: z.string().trim().optional(),
});

const updateProductSchema = baseProductSchema.partial().extend({
  slug: z.string().trim().min(1).optional(),
});

type CreateProductInput = z.input<typeof createProductSchema>;
type UpdateProductInput = z.input<typeof updateProductSchema>;

// ── Create ──────────────────────────────────────────────────────────────────

export async function createProductAction(
  input: CreateProductInput,
): Promise<ProductActionResult<{ id: string }>> {
  const parsed = createProductSchema.safeParse(input);
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
    .from("products")
    .insert({
      slug,
      name: data.name,
      description: data.description,
      category: data.category,
      gramatura_g: data.gramatura_g,
      price_site_cents: reaisToCents(data.price_site),
      price_ifood_cents: reaisToCents(data.price_ifood),
      attributes: data.attributes,
      tags: data.tags,
      contains: data.contains,
      photo_url: data.photo_url,
      photo_alt: data.photo_alt || data.name,
      active: data.active,
      stock: data.stock,
      low_stock_threshold: data.lowStockThreshold,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `Já existe produto com slug "${slug}". Escolha outro nome.` };
    }
    console.error("[products/create]", error.message);
    return { ok: false, message: "Não foi possível criar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id: inserted.id } };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateProductAction(
  id: string,
  input: UpdateProductInput,
): Promise<ProductActionResult> {
  if (!id) return { ok: false, message: "ID do produto ausente." };

  const parsed = updateProductSchema.safeParse(input);
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
  const patch: ProductUpdate = {};
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.category !== undefined) patch.category = data.category;
  if (data.gramatura_g !== undefined) patch.gramatura_g = data.gramatura_g;
  if (data.price_site !== undefined) patch.price_site_cents = reaisToCents(data.price_site);
  if (data.price_ifood !== undefined) patch.price_ifood_cents = reaisToCents(data.price_ifood);
  if (data.attributes !== undefined) patch.attributes = data.attributes;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.contains !== undefined) patch.contains = data.contains;
  if (data.photo_url !== undefined) patch.photo_url = data.photo_url;
  if (data.photo_alt !== undefined) patch.photo_alt = data.photo_alt;
  if (data.active !== undefined) patch.active = data.active;
  if (data.stock !== undefined) patch.stock = data.stock;
  if (data.lowStockThreshold !== undefined) patch.low_stock_threshold = data.lowStockThreshold;

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase.from("products").update(patch).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Slug já em uso. Escolha outro." };
    }
    console.error("[products/update]", error.message);
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Delete (soft) ───────────────────────────────────────────────────────────

export async function deleteProductAction(id: string): Promise<ProductActionResult> {
  if (!id) return { ok: false, message: "ID do produto ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", id);

  if (error) {
    console.error("[products/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Toggle active ───────────────────────────────────────────────────────────

export async function toggleActiveProductAction(
  id: string,
  active: boolean,
): Promise<ProductActionResult> {
  if (!id) return { ok: false, message: "ID do produto ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) {
    console.error("[products/toggleActive]", error.message);
    return { ok: false, message: "Não foi possível alterar visibilidade." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Stock ───────────────────────────────────────────────────────────────────

const stockSchema = z.object({
  id: z.string().min(1),
  value: z.coerce.number().int().nonnegative("Estoque mínimo é 0."),
});

export async function setStockAction(input: {
  id: string;
  value: number;
}): Promise<ProductActionResult> {
  const parsed = stockSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Valor inválido." };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("products")
    .update({ stock: parsed.data.value })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[products/setStock]", error.message);
    return { ok: false, message: "Não foi possível atualizar estoque." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
