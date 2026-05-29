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
 * - INSERT (pedido novo): incrementa newOrderCount (dispara o som/badge via
 *   use-new-order-notification) + router.refresh() pra carregar o pedido
 *   completo (itens, histórico) via re-hidratação do layout server.
 * - UPDATE (mudança de status): router.refresh().
 *
 * RLS garante que só admin recebe os eventos. Montar uma vez (no AdminShell).
 */
export function useOrdersRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const id = (payload.new as { id?: string } | null)?.id;
          if (id) {
            useAdminOrdersStore.setState((s) => ({
              newOrderCount: s.newOrderCount + 1,
              unacknowledgedIds: new Set([...s.unacknowledgedIds, id]),
            }));
          }
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);
}
