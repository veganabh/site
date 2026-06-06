"use client";

import posthog from "posthog-js";

/**
 * Wrapper seguro de analytics. Dispara para PostHog (comportamental) E para o
 * Meta Pixel (tráfego pago), cada um no-op quando não inicializado — o código de
 * captura espalhado pelo app nunca quebra, mesmo sem as keys configuradas.
 *
 * Dedup com a Conversions API (Etapa 5): cada evento ganha um `event_id` único
 * enviado ao Pixel como `eventID`. Quando o CAPI server-side disparar o mesmo
 * evento com o mesmo `event_id`, a Meta deduplica. Por ora só o browser usa.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export type AnalyticsEvent =
  | "add_to_cart"
  | "checkout_started"
  | "order_placed"
  | "notification_cta_clicked"
  | "view_content"
  | "payment_info_added";

function ready(): boolean {
  return typeof window !== "undefined" && posthog.__loaded === true;
}

/** Acessor tipado do `fbq` injetado pelo MetaPixelProvider. */
function getFbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.fbq as ((...args: unknown[]) => void) | undefined;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Remove chaves com valor undefined (mantém payload do Pixel limpo). */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

type MetaEvent = { name: string; params: Record<string, unknown> };

/**
 * Traduz evento interno → evento padrão do Meta Pixel.
 * `order_placed` NÃO vira Purchase aqui: Purchase é server-side via CAPI no
 * webhook AbacatePay (status pago), pra não contar pedido que não pagou.
 * `notification_cta_clicked` não tem evento padrão Meta.
 */
function toMeta(event: AnalyticsEvent, props?: Record<string, unknown>): MetaEvent | null {
  const p = props ?? {};
  switch (event) {
    case "add_to_cart":
      return {
        name: "AddToCart",
        params: compact({
          content_type: "product",
          content_ids: p.productId ? [p.productId] : undefined,
          content_name: p.name,
          value: p.price,
          currency: "BRL",
        }),
      };
    case "view_content":
      return {
        name: "ViewContent",
        params: compact({
          content_type: "product",
          content_ids: p.productId ? [p.productId] : undefined,
          content_name: p.name,
          value: p.price,
          currency: "BRL",
        }),
      };
    case "checkout_started":
      return {
        name: "InitiateCheckout",
        params: compact({
          value: p.value,
          num_items: p.items,
          currency: "BRL",
        }),
      };
    case "payment_info_added":
      return {
        name: "AddPaymentInfo",
        params: compact({
          value: p.value,
          currency: "BRL",
        }),
      };
    default:
      return null;
  }
}

export function captureEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  const eventId = newEventId();

  if (ready()) {
    try {
      posthog.capture(event, props);
    } catch {
      // analytics nunca derruba a UX
    }
  }

  if (PIXEL_ID) {
    const fbq = getFbq();
    const mapped = fbq ? toMeta(event, props) : null;
    if (fbq && mapped) {
      try {
        fbq("track", mapped.name, mapped.params, { eventID: eventId });
      } catch {
        /* no-op */
      }
    }
  }
}

export function identifyUser(distinctId: string, props?: Record<string, unknown>): void {
  if (!ready()) return;
  try {
    posthog.identify(distinctId, props);
  } catch {
    /* no-op */
  }
}

export function resetAnalytics(): void {
  if (!ready()) return;
  try {
    posthog.reset();
  } catch {
    /* no-op */
  }
}
