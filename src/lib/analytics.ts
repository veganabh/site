"use client";

import posthog from "posthog-js";

/**
 * Wrapper seguro de analytics (PostHog). Todas as funções são no-op quando o
 * PostHog não foi inicializado (sem NEXT_PUBLIC_POSTHOG_KEY) — assim o código
 * de captura espalhado pelo app nunca quebra, mesmo sem a key configurada.
 */

function ready(): boolean {
  return typeof window !== "undefined" && posthog.__loaded === true;
}

export type AnalyticsEvent =
  | "add_to_cart"
  | "checkout_started"
  | "order_placed"
  | "notification_cta_clicked";

export function captureEvent(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!ready()) return;
  try {
    posthog.capture(event, props);
  } catch {
    // analytics nunca derruba a UX
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
