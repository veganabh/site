"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/server/supabase/client";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";

/**
 * Assina mudanças em `orders` via Supabase Realtime (postgres_changes) e mantém
 * o kanban admin atualizado em tempo real — cross-device (substitui o
 * BroadcastChannel, que só sincronizava abas do mesmo navegador).
 *
 * Regra de "pedido novo" (decisão de produto): só pedido PAGO entra no painel.
 * O contador/som NÃO dispara no INSERT (pedido nasce pendente de pagamento —
 * ainda não é pedido), e sim quando o pedido VIRA pago:
 * - INSERT: só router.refresh() (re-hidrata; pendente nem aparece no kanban).
 * - UPDATE: se payment_status virou PAGO (e antes não era), incrementa
 *   newOrderCount + som/badge. Sempre router.refresh().
 *
 * RLS garante que só admin recebe os eventos. Montar uma vez (no AdminShell).
 */
export function useOrdersRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const next = payload.new as {
          id?: string;
          payment_status?: string;
          order_type?: string;
        } | null;
        // Encomendas (preorder) vivem só em /gestao/encomendas — não tocam o
        // painel diário nem o badge/som de "pedido novo".
        if (next?.order_type === "preorder") {
          router.refresh();
          return;
        }
        const id = next?.id;
        if (id && next?.payment_status === "PAGO") {
          // Pedido só "entra" no painel quando paga. Conta como novo na
          // transição pra PAGO — detectada pelo estado atual no store.
          const current = useAdminOrdersStore.getState().orders.find((o) => o.id === id);
          const wasPaid = current?.paymentStatus === "PAGO";
          if (!wasPaid) {
            useAdminOrdersStore.setState((s) => ({
              newOrderCount: s.newOrderCount + 1,
              unacknowledgedIds: new Set([...s.unacknowledgedIds, id]),
            }));
          }
        }
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);
}
