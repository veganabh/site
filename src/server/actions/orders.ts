"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/require-admin";
import type { OrderStatus } from "@/types/order";
import { canTransitionTo } from "@/types/order";

/**
 * Server actions de transição de status em `public.orders`.
 *
 * - Todas exigem role=admin (helper bloqueia mais cedo + RLS reforça no DB).
 * - Trigger `tg_orders_log_status_transition` valida a máquina de estado no
 *   nível do banco e registra `order_status_history`. Mesmo que o cliente
 *   tente uma transição inválida, o DB recusa.
 * - `revalidatePath("/", "layout")` re-fetcha listas após cada mudança.
 *
 * Cancelamento exige `cancelReason`. Chamada de entregador grava
 * `delivery_call_id`.
 */

export type OrderActionResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

async function applyStatusTransition(
  id: string,
  nextStatus: OrderStatus,
  patch: Record<string, unknown> = {},
): Promise<OrderActionResult> {
  if (!id) return { ok: false, message: "ID do pedido ausente." };

  const { supabase, error: authError } = await requireAdmin();
  if (authError) return { ok: false, message: authError };

  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("[orders/transition] fetch:", fetchError.message);
    return { ok: false, message: "Não foi possível ler o pedido." };
  }
  if (!current) return { ok: false, message: "Pedido não encontrado." };

  const fromStatus = current.status as OrderStatus;
  if (!canTransitionTo(fromStatus, nextStatus)) {
    return {
      ok: false,
      message: `Transição inválida: ${fromStatus} → ${nextStatus}.`,
    };
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: nextStatus, ...patch })
    .eq("id", id);

  if (updateError) {
    console.error("[orders/transition] update:", updateError.message);
    return { ok: false, message: "Não foi possível atualizar o pedido." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function acceptOrderAction(id: string): Promise<OrderActionResult> {
  return applyStatusTransition(id, "PREPARANDO");
}

const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Motivo deve ter ao menos 3 caracteres."),
});

export async function rejectOrderAction(
  id: string,
  reason: string,
): Promise<OrderActionResult> {
  const parsed = reasonSchema.safeParse({ reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Motivo do cancelamento é obrigatório.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  return applyStatusTransition(id, "CANCELADO", { cancel_reason: parsed.data.reason });
}

export async function markOrderReadyAction(id: string): Promise<OrderActionResult> {
  return applyStatusTransition(id, "PRONTO");
}

const callDeliverySchema = z.object({
  deliveryCallId: z.string().trim().min(1, "ID da chamada ausente."),
});

export async function callOrderDeliveryAction(
  id: string,
  deliveryCallId: string,
): Promise<OrderActionResult> {
  const parsed = callDeliverySchema.safeParse({ deliveryCallId });
  if (!parsed.success) {
    return { ok: false, message: "ID do entregador ausente." };
  }
  return applyStatusTransition(id, "A_CAMINHO", {
    delivery_call_id: parsed.data.deliveryCallId,
  });
}

export async function markOrderDeliveredAction(id: string): Promise<OrderActionResult> {
  return applyStatusTransition(id, "ENTREGUE");
}

export async function cancelOrderAction(
  id: string,
  reason: string,
): Promise<OrderActionResult> {
  const parsed = reasonSchema.safeParse({ reason });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Motivo do cancelamento é obrigatório.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  return applyStatusTransition(id, "CANCELADO", { cancel_reason: parsed.data.reason });
}
