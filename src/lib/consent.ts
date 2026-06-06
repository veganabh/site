"use client";

/**
 * Consentimento de cookies de marketing (LGPD — Etapa 7).
 *
 * Gateia o Meta Pixel: nenhum disparo até o aceite explícito. Decisão fica num
 * cookie `va_consent` (180 dias). PostHog (analytics first-party) segue fora
 * deste gate por ora — ver ADR 0014 D6.
 */

const CONSENT_COOKIE = "va_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 dias

export type Consent = "granted" | "denied" | "unset";

export function readConsent(): Consent {
  if (typeof document === "undefined") return "unset";
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return value === "granted" || value === "denied" ? value : "unset";
}

export function writeConsent(value: Exclude<Consent, "unset">): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}
