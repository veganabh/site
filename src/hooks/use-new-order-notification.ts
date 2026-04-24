"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAdminOrdersStore, ORDER_CHANNEL_NAME } from "@/stores/admin-orders-store";
import type { OrderChannelMessage } from "@/stores/admin-orders-store";

const SOUND_PREF_KEY = "vegana.admin-sound";

/**
 * Hook que agrupa as três notificações de pedido novo (D6 do ADR 0005):
 *   1. Beep de áudio (respeitando preferência do usuário)
 *   2. Notification API do browser
 *   3. Badge + document.title via newOrderCount da store admin
 *
 * Deve ser montado apenas em `/gestao/pedidos` para:
 *   - Solicitar permissão de Notification de forma lazy e contextual.
 *   - Não poluir outras rotas com event listeners desnecessários.
 *
 * Expõe `{ soundEnabled, toggleSound }` para o botão de on/off na página.
 */
export function useNewOrderNotification() {
  const newOrderCount = useAdminOrdersStore((s) => s.newOrderCount);
  const prevCountRef = useRef(newOrderCount);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    return stored === null ? true : stored === "true";
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_PREF_KEY, String(next));
      return next;
    });
  }, []);

  // ── Solicitar permissão de Notification lazily ao montar ─────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  // ── Reagir ao incremento de newOrderCount (canal BroadcastChannel) ───────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = new BroadcastChannel(ORDER_CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<OrderChannelMessage>) => {
      if (event.data.type !== "order:new") return;

      // 1. Beep
      if (soundEnabled) {
        try {
          // Placeholder — Pedro substitui public/sounds/new-order.mp3 depois.
          const audio = new Audio("/sounds/new-order.mp3");
          audio.volume = 0.6;
          void audio.play().catch(() => {
            /* autoplay bloqueado pelo browser ou arquivo ausente — silencioso */
          });
        } catch {
          /* Audio não disponível — silencioso */
        }
      }

      // 2. Notification API
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Novo pedido!", {
            body: `Pedido #${event.data.order.id} de ${event.data.order.customerName}`,
            icon: "/icons/logo-192.png",
          });
        } catch {
          /* Notification não disponível — silencioso */
        }
      }

      // 3. Incremento do newOrderCount é feito pela store quando ela recebe
      //    a mensagem order:new via subscriber próprio.
      // O document.title é atualizado no useEffect abaixo que observa newOrderCount.
    };

    return () => {
      channel.close();
    };
  }, [soundEnabled]);

  // ── Atualizar document.title conforme newOrderCount ──────────────────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (newOrderCount > 0) {
      document.title = `(${newOrderCount}) Veg.ana Admin`;
    } else {
      document.title = "Veg.ana Admin";
    }

    return () => {
      document.title = "Veg.ana Admin";
    };
  }, [newOrderCount]);

  // ── Beep também quando newOrderCount incrementa localmente ───────────────
  // (cobre o caso onde a store recebe order:new via seu próprio subscriber)
  useEffect(() => {
    if (newOrderCount > prevCountRef.current && soundEnabled) {
      try {
        const audio = new Audio("/sounds/new-order.mp3");
        audio.volume = 0.6;
        void audio.play().catch(() => {
          /* silencioso */
        });
      } catch {
        /* silencioso */
      }
    }
    prevCountRef.current = newOrderCount;
  }, [newOrderCount, soundEnabled]);

  return { soundEnabled, toggleSound };
}
