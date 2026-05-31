"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import type { Database } from "@/types/db";
import type { CouponStatus, CouponType } from "@/types/coupon";

type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];

export type CouponActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const reaisToCents = (reais: number): number => Math.round(reais * 100);

// `value` no DB é inteiro:
// - PERCENTUAL: 0–100 (passa direto)
// - FIXO: centavos
// - FRETE_GRATIS: ignorado (0)
function valueToDb(type: CouponType, valueReais: number): number {
  if (type === "PERCENTUAL") return Math.round(valueReais);
  if (type === "FIXO") return reaisToCents(valueReais);
  return 0;
}

const baseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Código obrigatório.")
    .max(50)
    .transform((s) => s.toUpperCase()),
  label: z.string().trim().max(80).default(""),
  hint: z.string().trim().min(1, "Descrição obrigatória.").max(200),
  type: z.enum(["PERCENTUAL", "FIXO", "FRETE_GRATIS"]),
  value: z.coerce.number().nonnegative().default(0),
  minOrderValue: z.coerce.number().nonnegative().optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  validFrom: z.string().min(1, "Data inicial obrigatória."),
  validUntil: z.string().optional(),
  status: z.enum(["ATIVO", "INATIVO"]),
  eligibility: z.enum(["ALL", "FIRST_PURCHASE"]).default("ALL"),
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial();

type CreateInput = z.input<typeof createSchema>;
type UpdateInput = z.input<typeof updateSchema>;

// ── Create ──────────────────────────────────────────────────────────────────

export async function createCouponAction(
  input: CreateInput,
): Promise<CouponActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
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
  const insert: CouponInsert = {
    code: data.code,
    label: data.label || data.code,
    hint: data.hint,
    type: data.type,
    value: valueToDb(data.type, data.value ?? 0),
    min_order_value_cents:
      data.minOrderValue !== undefined ? reaisToCents(data.minOrderValue) : null,
    max_uses: data.maxUses ?? null,
    valid_from: data.validFrom,
    valid_until: data.validUntil || null,
    status: data.status,
    eligibility: data.eligibility ?? "ALL",
  };

  const { data: inserted, error } = await supabase
    .from("coupons")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `Cupom "${data.code}" já existe.` };
    }
    console.error("[coupons/create]", error.message);
    return { ok: false, message: "Não foi possível criar o cupom." };
  }

  revalidatePath("/gestao/cupons");
  revalidatePath("/gestao/modulos");
  return { ok: true, data: { id: inserted.id } };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateCouponAction(
  id: string,
  input: UpdateInput,
): Promise<CouponActionResult> {
  if (!id) return { ok: false, message: "ID do cupom ausente." };

  const parsed = updateSchema.safeParse(input);
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
  const patch: CouponUpdate = {};
  if (data.code !== undefined) patch.code = data.code;
  if (data.label !== undefined) patch.label = data.label;
  if (data.hint !== undefined) patch.hint = data.hint;
  if (data.type !== undefined) patch.type = data.type;
  if (data.value !== undefined && data.type !== undefined) {
    patch.value = valueToDb(data.type, data.value);
  }
  if (data.minOrderValue !== undefined)
    patch.min_order_value_cents = reaisToCents(data.minOrderValue);
  if (data.maxUses !== undefined) patch.max_uses = data.maxUses;
  if (data.validFrom !== undefined) patch.valid_from = data.validFrom;
  if (data.validUntil !== undefined) patch.valid_until = data.validUntil || null;
  if (data.status !== undefined) patch.status = data.status;
  if (data.eligibility !== undefined) patch.eligibility = data.eligibility;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from("coupons").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Código já está em uso por outro cupom." };
    }
    console.error("[coupons/update]", error.message);
    return { ok: false, message: "Não foi possível salvar." };
  }

  revalidatePath("/gestao/cupons");
  revalidatePath("/gestao/modulos");
  return { ok: true };
}

// ── Soft delete ─────────────────────────────────────────────────────────────

export async function softDeleteCouponAction(id: string): Promise<CouponActionResult> {
  if (!id) return { ok: false, message: "ID do cupom ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { error } = await supabase
    .from("coupons")
    .update({ deleted_at: new Date().toISOString(), status: "INATIVO" })
    .eq("id", id);

  if (error) {
    console.error("[coupons/delete]", error.message);
    return { ok: false, message: "Não foi possível excluir." };
  }

  revalidatePath("/gestao/cupons");
  revalidatePath("/gestao/modulos");
  return { ok: true };
}

// ── Toggle status ──────────────────────────────────────────────────────────

export async function toggleCouponStatusAction(id: string): Promise<CouponActionResult> {
  if (!id) return { ok: false, message: "ID do cupom ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { data: row, error: readError } = await supabase
    .from("coupons")
    .select("status, valid_until, max_uses, used_count")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError || !row) {
    return { ok: false, message: "Cupom não encontrado." };
  }

  const status = row.status as CouponStatus;
  if (status === "EXPIRADO") {
    return { ok: false, message: "Cupom expirado não pode ser alterado." };
  }
  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return { ok: false, message: "Cupom esgotado não pode ser alterado." };
  }
  if (row.valid_until && new Date(row.valid_until) < new Date()) {
    return { ok: false, message: "Cupom expirou por data e não pode ser alterado." };
  }

  const next: CouponStatus = status === "ATIVO" ? "INATIVO" : "ATIVO";
  const { error } = await supabase.from("coupons").update({ status: next }).eq("id", id);
  if (error) {
    console.error("[coupons/toggle]", error.message);
    return { ok: false, message: "Não foi possível alterar status." };
  }

  revalidatePath("/gestao/cupons");
  revalidatePath("/gestao/modulos");
  return { ok: true };
}
