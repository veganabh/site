"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import type { Database } from "@/types/db";

type StoreSettingsUpdate = Database["public"]["Tables"]["store_settings"]["Update"];

export type StoreSettingsActionResult = { ok: true } | { ok: false; message: string };

const dayHoursSchema = z.object({
  open: z.boolean(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
});

const weekHoursSchema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
});

const preorderPatchSchema = z.object({
  minLeadDays: z.number().int().min(0).max(30).optional(),
  maxLeadDays: z.number().int().min(1).max(365).optional(),
  minValueCents: z.number().int().min(0).optional(),
  dailyCapacity: z.number().int().min(1).nullable().optional(),
  hourFrom: z.number().int().min(0).max(23).optional(),
  hourTo: z.number().int().min(0).max(23).optional(),
});

const patchSchema = z.object({
  storeStatus: z.enum(["ATIVO", "PAUSADO"]).optional(),
  hours: weekHoursSchema.optional(),
  printerEnabled: z.boolean().optional(),
  printerName: z.string().max(120).optional(),
  autoAccept: z.boolean().optional(),
  preorder: preorderPatchSchema.optional(),
});

export type StoreSettingsPatch = z.input<typeof patchSchema>;

/**
 * Persiste config da loja na tabela singleton. Admin-only (RLS + requireAdmin).
 * Recebe patch parcial (só os campos que mudaram).
 */
export async function updateStoreSettingsAction(
  patch: StoreSettingsPatch,
): Promise<StoreSettingsActionResult> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, message: "Configuração inválida." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const dbPatch: StoreSettingsUpdate = {};
  if (parsed.data.storeStatus !== undefined) dbPatch.store_status = parsed.data.storeStatus;
  if (parsed.data.hours !== undefined) dbPatch.hours = parsed.data.hours;
  if (parsed.data.printerEnabled !== undefined)
    dbPatch.printer_enabled = parsed.data.printerEnabled;
  if (parsed.data.printerName !== undefined) dbPatch.printer_name = parsed.data.printerName;
  if (parsed.data.autoAccept !== undefined) dbPatch.auto_accept = parsed.data.autoAccept;
  // Preorder settings
  if (parsed.data.preorder !== undefined) {
    const p = parsed.data.preorder;
    if (p.minLeadDays !== undefined) dbPatch.preorder_min_lead_days = p.minLeadDays;
    if (p.maxLeadDays !== undefined) dbPatch.preorder_max_lead_days = p.maxLeadDays;
    if (p.minValueCents !== undefined) dbPatch.preorder_min_value_cents = p.minValueCents;
    if (p.dailyCapacity !== undefined) dbPatch.preorder_daily_capacity = p.dailyCapacity;
    if (p.hourFrom !== undefined) dbPatch.preorder_hour_from = p.hourFrom;
    if (p.hourTo !== undefined) dbPatch.preorder_hour_to = p.hourTo;
  }

  if (Object.keys(dbPatch).length === 0) return { ok: true };

  const { error } = await supabase.from("store_settings").update(dbPatch).eq("id", "default");

  if (error) {
    console.error("[store-settings/update]", error.message);
    return { ok: false, message: "Não foi possível salvar." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
