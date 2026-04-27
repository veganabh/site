"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import { RING_DEFAULTS } from "@/server/rings-defaults";
import type { Database } from "@/types/db";

type RingUpdate = Database["public"]["Tables"]["delivery_rings"]["Update"];

/**
 * Server actions de edição da tabela `public.delivery_rings`.
 * Todas exigem role=admin (RLS já garante; helper bloqueia mais cedo
 * com mensagem amigável). Reais → centavos é convertido aqui.
 */

export type RingActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const reaisToCents = (reais: number): number => Math.round(reais * 100);

// ── Update individual ───────────────────────────────────────────────────────

const updateRingSchema = z.object({
  fee: z.coerce.number().nonnegative("Taxa não pode ser negativa.").optional(),
  etaMin: z.coerce.number().int().positive("ETA mínimo deve ser positivo.").optional(),
  etaMax: z.coerce.number().int().positive("ETA máximo deve ser positivo.").optional(),
  active: z.boolean().optional(),
});

export async function updateRingAction(
  id: string,
  patch: z.input<typeof updateRingSchema>,
): Promise<RingActionResult> {
  if (!id) return { ok: false, message: "ID do anel ausente." };

  const parsed = updateRingSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verifique os valores informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  if (data.etaMin !== undefined && data.etaMax !== undefined && data.etaMax < data.etaMin) {
    return { ok: false, message: "ETA máximo precisa ser maior ou igual ao mínimo." };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const update: RingUpdate = {};
  if (data.fee !== undefined) update.fee_cents = reaisToCents(data.fee);
  if (data.etaMin !== undefined) update.eta_min = data.etaMin;
  if (data.etaMax !== undefined) update.eta_max = data.etaMax;
  if (data.active !== undefined) update.active = data.active;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("delivery_rings").update(update).eq("id", id);
  if (error) {
    console.error("[rings/update]", error.message);
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Bulk: raio máximo ativo ────────────────────────────────────────────────

const setMaxRadiusSchema = z.object({
  meters: z.coerce.number().int().min(0).max(10000),
});

export async function setMaxActiveRadiusAction(
  input: z.input<typeof setMaxRadiusSchema>,
): Promise<RingActionResult> {
  const parsed = setMaxRadiusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Raio inválido. Deve estar entre 0 e 10.000m." };
  }

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { meters } = parsed.data;

  const [activate, deactivate] = await Promise.all([
    supabase
      .from("delivery_rings")
      .update({ active: true })
      .lte("outer_radius_m", meters),
    supabase
      .from("delivery_rings")
      .update({ active: false })
      .gt("outer_radius_m", meters),
  ]);

  if (activate.error || deactivate.error) {
    console.error(
      "[rings/setMaxRadius]",
      activate.error?.message ?? deactivate.error?.message,
    );
    return { ok: false, message: "Não foi possível atualizar zonas." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Reset para defaults ────────────────────────────────────────────────────

export async function resetRingsToDefaultsAction(): Promise<RingActionResult> {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const results = await Promise.all(
    RING_DEFAULTS.map((d) =>
      supabase
        .from("delivery_rings")
        .update({
          fee_cents: d.fee_cents,
          eta_min: d.eta_min,
          eta_max: d.eta_max,
          active: d.active,
          label: d.label,
        })
        .eq("ring_order", d.ring_order),
    ),
  );

  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    console.error("[rings/reset]", firstError.message);
    return { ok: false, message: "Falha ao restaurar padrões. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
