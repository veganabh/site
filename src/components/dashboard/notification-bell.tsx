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
 * - Rounded: rounded-full (botão), rounded-lg (popover), rounded-pill (CTA).
 * - Contraste WCAG AA garantido nos pares de texto/fundo usados.
 *
 * P0: sem realtime — dados via TanStack Query (stale 5 min).
 */

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell, BellOff, Megaphone, Rocket, AlertCircle, BookOpen, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
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
};

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const cfg = TYPE_CONFIG[notification.type];
  const { Icon, label, iconClass } = cfg;

  return (
    <article
      className={cn(
        "flex gap-3 rounded-md px-3 py-2.5 transition-colors",
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
          <p className="text-[11px] font-semibold uppercase tracking-wide text-olive-700/70">
            {label}
          </p>
          {!notification.read && (
            <button
              type="button"
              aria-label={`Marcar "${notification.title}" como lida`}
              onClick={() => onRead(notification.id)}
              className="shrink-0 text-olive-700/50 transition-colors hover:text-olive-900"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-0.5 text-body-sm font-semibold leading-snug text-olive-900 line-clamp-1">
          {notification.title}
        </p>
        <p className="mt-0.5 text-caption leading-snug text-olive-700 line-clamp-2">
          {notification.body}
        </p>

        {notification.ctaHref && notification.ctaLabel && (
          <Link
            href={notification.ctaHref}
            onClick={() => onRead(notification.id)}
            className="mt-1.5 inline-flex h-7 items-center rounded-pill bg-olive-900 px-3 text-[11px] font-semibold text-paper-50 transition-colors hover:bg-olive-700"
          >
            {notification.ctaLabel}
          </Link>
        )}
      </div>
    </article>
  );
}

// ── NotificationBell ──────────────────────────────────────────────────────────

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();

  const hasNotifications = notifications.length > 0;
  const badgeCount = Math.min(unreadCount, 9);
  const badgeLabel = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover.Root>
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
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-500 px-0.5 text-[9px] font-bold leading-none text-paper-50"
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
            "z-50 w-[340px] max-w-[calc(100vw-16px)] rounded-lg border border-divider bg-paper-50 shadow-lg",
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
            className="max-h-[400px] overflow-y-auto py-1"
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
                <BellOff
                  className="h-8 w-8 text-olive-700/30"
                  aria-hidden="true"
                  strokeWidth={1.25}
                />
                <p className="text-caption text-olive-700">Sem novidades por enquanto.</p>
              </div>
            )}

            {!isLoading &&
              notifications.map((n) => (
                <div role="listitem" key={n.id}>
                  <NotificationItem notification={n} onRead={markRead} />
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
