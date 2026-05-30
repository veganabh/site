import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

type Service = SupabaseClient<Database>;

/**
 * Confirma o pagamento de um pedido e aplica a regra de auto-aceitar.
 *
 * Fluxo (decisão de produto):
 * - Pedido nasce NOVO + PENDENTE e NÃO aparece no painel até pagar.
 * - Ao virar PAGO:
 *   - auto_accept ON  → vai direto pra PREPARANDO (gestora não precisa aceitar).
 *   - auto_accept OFF → fica em NOVO pra gestora aceitar/recusar.
 * - Só promove se o status atual ainda for NOVO (não rebaixa pedido já avançado
 *   nem mexe em cancelado). O trigger `tg_orders_log_status_transition` registra
 *   a mudança no histórico automaticamente.
 *
 * Idempotente o suficiente: webhook duplicado já é barrado por idempotency_key
 * antes de chamar aqui; ainda assim a guarda `status === 'NOVO'` evita efeito
 * colateral se chamado mais de uma vez.
 */
export async function confirmOrderPayment(
  service: Service,
  orderId: string,
  orderPaymentStatus: "PAGO" | "ESTORNADO",
): Promise<void> {
  // Estorno: só marca o pagamento; não mexe no fluxo do kanban aqui.
  if (orderPaymentStatus === "ESTORNADO") {
    await service.from("orders").update({ payment_status: "ESTORNADO" }).eq("id", orderId);
    return;
  }

  // PAGO: lê status atual do pedido + flag de auto-aceitar.
  const [{ data: order }, { data: settings }] = await Promise.all([
    service.from("orders").select("status").eq("id", orderId).maybeSingle(),
    service.from("store_settings").select("auto_accept").eq("id", "default").maybeSingle(),
  ]);

  const promote = settings?.auto_accept === true && order?.status === "NOVO";

  await service
    .from("orders")
    .update({
      payment_status: "PAGO",
      ...(promote ? { status: "PREPARANDO" } : {}),
    })
    .eq("id", orderId);
}
