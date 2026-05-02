/**
 * Tipos do módulo de notificações broadcast da marca.
 *
 * Canal para promoções, lançamentos, avisos operacionais e conteúdo.
 * NÃO ligado a pedido — independente do ActiveOrderChip.
 */

export type NotificationType = "promo" | "launch" | "operational" | "content";

export type NotificationAudience = "all" | "authed";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  audience: NotificationAudience;
  publishedAt: string;
  expiresAt: string;
  createdAt: string;
  /** Presente apenas quando buscado com contexto de usuário autenticado. */
  read?: boolean;
};

/**
 * Input de criação/edição — validado pelo Zod schema compartilhado em
 * `src/lib/notifications/schema.ts`.
 */
export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  audience: NotificationAudience;
  publishedAt: string;
  expiresAt: string;
};
