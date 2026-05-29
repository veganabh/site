"use client";

/**
 * NotificationBell — sino de notificações broadcast da marca.
 *
 * Radix Popover com lista de notificações, badge de não lidas e ação
 * "marcar tudo como lido". Substitui o botão mock no TopBar.
 *
 * DS compliance:
 * - Tokens: olive-900, terra-500, paper-50/100, divider, leaf-500.
 * - Tipografia: text-body-sm, text-caption.
 * - Rounded: rounded-full (botão), rounded-sm (popover), rounded-full (CTA).
 * - Contraste WCAG AA garantido nos pares de texto/fundo usados.
 *
 * P0: sem realtime — dados via TanStack Query (stale 5 min).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Bell, BellOff, Megaphone, Rocket, AlertCircle, BookOpen, X, Ticket } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { trackNotificationClickAction } from "@/server/actions/notifications";
import { captureEvent } from "@/lib/analytics";
import { getAnonId } from "@/lib/anon-id";
import { useCartStore } from "@/stores/cart-store";
import type { Notification, NotificationType } from "@/types/notification";

// ── Helpers de tipo ───────────────────────────────────────────────────────────

type TypeConfig = {
  Icon: React.ElementType;
  label: string;
  iconClass: string;
};

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  promo: {
    Icon: Megaphone,
    label: "Promoção",
    iconClass: "text-terra-500",
  },
  launch: {
    Icon: Rocket,
    label: "Lançamento",
    iconClass: "text-leaf-500",
  },
  operational: {
    Icon: AlertCircle,
    label: "Aviso",
    iconClass: "text-olive-700",
  },
  content: {
    Icon: BookOpen,
    label: "Dica",
    iconClass: "text-olive-700",
  },
};

// ── NotificationItem ──────────────────────────────────────────────────────────

type NotificationItemProps = {
  notification: Notification;
  onRead: (id: string) => void;
  /** Clique no CTA: registra clique + fecha popover + navega (no parent). */
  onCtaClick: (notification: Notification) => void;
};

function NotificationItem({ notification, onRead, onCtaClick }: NotificationItemProps) {
  const cfg = TYPE_CONFIG[notification.type];
  const { Icon, label, iconClass } = cfg;

  return (
    <article
      className={cn(
        "flex gap-3 rounded-sm px-3 py-2.5 transition-colors",
        notification.read
          ? "opacity-60 hover:bg-paper-100/60"
          : "bg-paper-100/50 hover:bg-paper-100",
      )}
    >
      {/* Ícone do tipo */}
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-divider bg-paper-50",
          iconClass,
        )}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-micro font-semibold tracking-wide text-olive-700 uppercase">{label}</p>
          {!notification.read && (
            <button
              type="button"
              aria-label={`Marcar "${notification.title}" como lida`}
              onClick={() => onRead(notification.id)}
              className="shrink-0 text-olive-700 transition-colors hover:text-olive-900"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-0.5 line-clamp-1 text-body-sm leading-snug font-semibold text-olive-900">
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-caption leading-snug text-olive-700">
          {notification.body}
        </p>

        {(notification.couponCode || (notification.ctaHref && notification.ctaLabel)) && (
          <button
            type="button"
            onClick={() => onCtaClick(notification)}
            className="mt-1.5 inline-flex h-7 items-center gap-1 rounded-full bg-terra-700 px-3 text-micro font-semibold text-paper-50 transition-colors hover:bg-terra-500"
          >
            {notification.couponCode && <Ticket className="h-3 w-3" aria-hidden="true" />}
            {notification.ctaLabel ||
              (notification.couponCode ? `Usar ${notification.couponCode}` : "")}
          </button>
        )}
      </div>
    </article>
  );
}

// ── NotificationBell ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const hasNotifications = notifications.length > 0;
  const badgeCount = Math.min(unreadCount, 9);
  const badgeLabel = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  // Abrir o sino = leitura (impressão). Marca as visíveis como lidas (dedup
  // por PK no server). É o único gatilho de "leitura" — clicar no CTA é clique.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  // Clique no CTA: registra clique (dedup por usuário) + fecha + navega
  // programaticamente (Link dentro do popover era cancelado ao desmontar).
  const handleCtaClick = async (notification: Notification) => {
    // Sempre passa anonId; o server usa profile_id se logado, anon_id se não.
    void trackNotificationClickAction(notification.id, getAnonId());
    captureEvent("notification_cta_clicked", {
      notificationId: notification.id,
      type: notification.type,
      coupon: notification.couponCode ?? undefined,
    });
    setOpen(false);

    // Cupom anexado → aplica no carrinho + feedback visual (toast).
    if (notification.couponCode) {
      const { items, applyCoupon } = useCartStore.getState();
      const subtotalCents = Math.round(
        items.reduce((s, i) => s + i.product.price_site * i.quantity, 0) * 100,
      );
      const res = await applyCoupon(notification.couponCode, subtotalCents);
      if (res.ok) {
        toast.success(`Cupom ${notification.couponCode} aplicado ao carrinho`, {
          icon: <Ticket className="h-4 w-4" />,
        });
      } else {
        toast.message(`Cupom ${notification.couponCode}`, {
          description: res.message || "Adicione itens ao carrinho para usar.",
        });
      }
      router.push(notification.ctaHref || "/carrinho");
      return;
    }

    if (notification.ctaHref) router.push(notification.ctaHref);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notificações — ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
              : "Notificações"
          }
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-paper-50 text-olive-900 transition-colors hover:bg-paper-100 focus-visible:outline-olive-500"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />

          {/* Badge de não lidas */}
          {badgeLabel && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-500 px-0.5 text-micro leading-none font-bold text-paper-50"
            >
              {badgeLabel}
            </span>
          )}

          {/* Ponto quando sem contagem mas com não lidas (fallback visual) */}
          {!badgeLabel && badgeCount === 0 && false /* reservado */ && (
            <span
              aria-hidden="true"
              className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-terra-500"
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-[340px] max-w-[calc(100vw-16px)] rounded-sm border border-divider bg-paper-50 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
          aria-label="Painel de notificações"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-divider px-4 py-3">
            <h2 className="text-body-sm font-semibold text-olive-900">Novidades</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-caption font-medium text-olive-700 underline-offset-2 transition-colors hover:text-olive-900 hover:underline"
              >
                Marcar tudo como lido
              </button>
            )}
          </div>

          {/* Lista */}
          <div
            role="list"
            aria-label="Lista de notificações"
            className="flex max-h-[400px] flex-col gap-1 overflow-y-auto p-2"
          >
            {isLoading && (
              <p
                role="status"
                aria-live="polite"
                className="px-4 py-6 text-center text-caption text-olive-700"
              >
                Carregando…
              </p>
            )}

            {!isLoading && !hasNotifications && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <BellOff className="h-8 w-8 text-olive-700" aria-hidden="true" strokeWidth={1.25} />
                <p className="text-caption text-olive-700">Sem novidades por enquanto.</p>
              </div>
            )}

            {!isLoading &&
              notifications.map((n) => (
                <div role="listitem" key={n.id}>
                  <NotificationItem
                    notification={n}
                    onRead={markRead}
                    onCtaClick={handleCtaClick}
                  />
                </div>
              ))}
          </div>

          {/* Rodapé — seta do Popover */}
          <Popover.Arrow className="fill-paper-50" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
