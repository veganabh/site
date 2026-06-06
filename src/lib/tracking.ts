"use client";

/**
 * Captura e leitura de atribuição de tráfego pago (Etapa 4).
 *
 * Fluxo:
 *  1. `captureUtmFromUrl()` roda no landing (MetaPixelProvider) — se a URL tem
 *     `utm_*`, grava num cookie `va_utm` (30 dias). Sobrevive à navegação até o
 *     checkout, onde a URL original já não existe.
 *  2. `readTracking()` no checkout junta os UTM gravados + cookies `_fbp`/`_fbc`
 *     que o Meta Pixel cria. O resultado vai pro pedido (place-order) → CAPI.
 */

const UTM_COOKIE = "va_utm";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export type TrackingData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbp?: string;
  fbc?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Grava o cookie de UTM se a URL atual trouxe parâmetros utm_*. */
export function captureUtmFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 200);
  }

  if (Object.keys(utm).length === 0) return; // não sobrescreve com vazio

  try {
    const value = encodeURIComponent(JSON.stringify(utm));
    document.cookie = `${UTM_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    /* no-op */
  }
}

/** Junta UTM gravados + cookies de match do Pixel (_fbp/_fbc). */
export function readTracking(): TrackingData {
  const out: TrackingData = {};

  const rawUtm = readCookie(UTM_COOKIE);
  if (rawUtm) {
    try {
      const parsed = JSON.parse(rawUtm) as Record<string, unknown>;
      for (const key of UTM_KEYS) {
        const value = parsed[key];
        if (typeof value === "string") out[key] = value;
      }
    } catch {
      /* cookie corrompido — ignora */
    }
  }

  const fbp = readCookie("_fbp");
  const fbc = readCookie("_fbc");
  if (fbp) out.fbp = fbp;
  if (fbc) out.fbc = fbc;

  return out;
}
