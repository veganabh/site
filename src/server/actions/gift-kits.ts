"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import { GIFT_KIT_ICON_NAMES } from "@/lib/kit-icons";
import type { Database } from "@/types/db";

type TemplateUpdate = Database["public"]["Tables"]["gift_kit_templates"]["Update"];

/**
 * CRUD admin de gift kits. Server-only, gate role=admin via RLS.
 *
 * Após mutate: `revalidatePath("/", "layout")` força root layout a re-fetch
 * `listGiftKitTemplates()` e o `GiftKitsStoreHydrator` empurra a lista
 * atualizada nos consumers (admin + público lêem o mesmo store).
 */

export type GiftKitActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reaisToCents = (reais: number): number => Math.round(reais * 100);

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const slotInputSchema = z.object({
  label: z.string().trim().min(1, "Nome do slot obrigatório.").max(80),
  helper: z.string().trim().max(120).optional(),
  qty: z.coerce.number().int().positive("Quantidade precisa ser >= 1."),
  eligibleProductIds: z
    .array(z.string().uuid("ID de produto inválido."))
    .min(1, "Slot precisa de ao menos 1 produto elegível."),
});

const baseTemplateSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(80),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().trim().min(10, "Descrição muito curta.").max(2000),
  price: z.coerce.number().positive("Preço deve ser maior que zero."),
  priceIfoodAnchor: z.coerce.number().positive("Âncora iFood inválida."),
  iconName: z.enum(GIFT_KIT_ICON_NAMES),
  coverPhotoUrl: z.string().trim().min(1, "URL da foto obrigatória.").max(500),
  coverPhotoAlt: z.string().trim().max(200).default(""),
  active: z.boolean().default(true),
});

const createTemplateSchema = baseTemplateSchema
  .extend({
    slug: z.string().trim().regex(SLUG_RE).min(2).max(60).optional(),
    slots: z.array(slotInputSchema).min(1, "Pelo menos 1 slot."),
  })
  .refine((d) => d.priceIfoodAnchor > d.price, {
    message: "Âncora iFood deve ser maior que o preço do kit.",
    path: ["priceIfoodAnchor"],
  });

const updateTemplateSchema = baseTemplateSchema.partial().extend({
  slug: z.string().trim().regex(SLUG_RE).min(2).max(60).optional(),
});

const setSlotsSchema = z.array(slotInputSchema).min(1, "Pelo menos 1 slot.");

type CreateTemplateInput = z.input<typeof createTemplateSchema>;
type UpdateTemplateInput = z.input<typeof updateTemplateSchema>;
type SetSlotsInput = z.input<typeof setSlotsSchema>;

// ── Create (template + slots) ───────────────────────────────────────────────

export async function createGiftKitAction(
  input: CreateTemplateInput,
): Promise<GiftKitActionResult<{ id: string }>> {
  const parsed = createTemplateSchema.safeParse(input);
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

  const { data: inserted, error: insertError } = await supabase
    .from("gift_kit_templates")
    .insert({
      slug,
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      price_cents: reaisToCents(data.price),
      price_ifood_anchor_cents: reaisToCents(data.priceIfoodAnchor),
      icon_name: data.iconName,
      cover_photo_url: data.coverPhotoUrl,
      cover_photo_alt: data.coverPhotoAlt || data.name,
      active: data.active,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, message: `Já existe kit com slug "${slug}".` };
    }
    console.error("[gift-kits/create]", insertError.message);
    return { ok: false, message: "Não foi possível criar o kit." };
  }

  const slotsPayload = data.slots.map((s, idx) => ({
    template_id: inserted.id,
    slot_order: idx + 1,
    label: s.label,
    helper: s.helper ?? null,
    qty: s.qty,
    eligible_product_ids: s.eligibleProductIds,
  }));

  const { error: slotsError } = await supabase.from("gift_kit_slots").insert(slotsPayload);
  if (slotsError) {
    // Rollback manual: hard-delete template recém criado pra não deixar órfão.
    await supabase.from("gift_kit_templates").delete().eq("id", inserted.id);
    console.error("[gift-kits/create slots]", slotsError.message);
    return { ok: false, message: "Não foi possível criar os slots — kit revertido." };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id: inserted.id } };
}

// ── Update (só template) ────────────────────────────────────────────────────

export async function updateGiftKitAction(
  id: string,
  input: UpdateTemplateInput,
): Promise<GiftKitActionResult> {
  if (!id) return { ok: false, message: "ID do kit ausente." };

  const parsed = updateTemplateSchema.safeParse(input);
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
  const patch: TemplateUpdate = {};
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.name !== undefined) patch.name = data.name;
  if (data.tagline !== undefined) patch.tagline = data.tagline;
  if (data.description !== undefined) patch.description = data.description;
  if (data.price !== undefined) patch.price_cents = reaisToCents(data.price);
  if (data.priceIfoodAnchor !== undefined)
    patch.price_ifood_anchor_cents = reaisToCents(data.priceIfoodAnchor);
  if (data.iconName !== undefined) patch.icon_name = data.iconName;
  if (data.coverPhotoUrl !== undefined) patch.cover_photo_url = data.coverPhotoUrl;
  if (data.coverPhotoAlt !== undefined) patch.cover_photo_alt = data.coverPhotoAlt;
  if (data.active !== undefined) patch.active = data.active;

  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase.from("gift_kit_templates").update(patch).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Slug já em uso. Escolha outro." };
    }
    console.error("[gift-kits/update]", error.message);
    return { ok: false, message: "Não foi possível salvar." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Set slots (replace-all) ─────────────────────────────────────────────────

export async function setGiftKitSlotsAction(
  templateId: string,
  slots: SetSlotsInput,
): Promise<GiftKitActionResult> {
  if (!templateId) return { ok: false, message: "ID do kit ausente." };

  const parsed = setSlotsSchema.safeParse(slots);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os slots.",
    };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  // Replace-all: DELETE existentes + INSERT novos. Sem RPC transactional —
  // janela de visibilidade vazia é mitigada por ordem (DELETE depois de INSERT
  // não dá: UNIQUE (template_id, slot_order)). Aceitamos a janela curta;
  // RLS do template ainda libera leitura, mas slots somem por instantes.
  const { error: deleteError } = await supabase
    .from("gift_kit_slots")
    .delete()
    .eq("template_id", templateId);

  if (deleteError) {
    console.error("[gift-kits/setSlots delete]", deleteError.message);
    return { ok: false, message: "Não foi possível atualizar os slots." };
  }

  const payload = parsed.data.map((s, idx) => ({
    template_id: templateId,
    slot_order: idx + 1,
    label: s.label,
    helper: s.helper ?? null,
    qty: s.qty,
    eligible_product_ids: s.eligibleProductIds,
  }));

  const { error: insertError } = await supabase.from("gift_kit_slots").insert(payload);
  if (insertError) {
    console.error("[gift-kits/setSlots insert]", insertError.message);
    return { ok: false, message: "Slots novos não inseridos — antigos perdidos." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Delete (soft) ───────────────────────────────────────────────────────────

export async function deleteGiftKitAction(id: string): Promise<GiftKitActionResult> {
  if (!id) return { ok: false, message: "ID do kit ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("gift_kit_templates")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", id);

  if (error) {
    console.error("[gift-kits/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Toggle active ───────────────────────────────────────────────────────────

export async function toggleActiveGiftKitAction(
  id: string,
  active: boolean,
): Promise<GiftKitActionResult> {
  if (!id) return { ok: false, message: "ID do kit ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase.from("gift_kit_templates").update({ active }).eq("id", id);
  if (error) {
    console.error("[gift-kits/toggleActive]", error.message);
    return { ok: false, message: "Não foi possível alterar visibilidade." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
