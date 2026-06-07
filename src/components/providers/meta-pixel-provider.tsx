"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { captureUtmFromUrl } from "@/lib/tracking";
import { useConsent } from "@/components/providers/consent-provider";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Acessor tipado do `fbq` injetado no window. undefined antes do base code. */
function getFbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.fbq as ((...args: unknown[]) => void) | undefined;
}

/** Injeta o base code do Pixel (idempotente — no-op se já injetado). */
function injectBaseCode(): void {
  if (typeof window === "undefined" || getFbq()) return;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod(...args);
      } else {
        n.queue.push(args);
      }
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Inicializa o Meta Pixel e dispara `PageView` em cada rota.
 *
 * LGPD (Etapa 7): só roda com `consent === "granted"`. Sem aceite, nem carrega.
 *
 * Um ÚNICO efeito faz injeção + init + PageView em sequência — evita a corrida
 * em que um efeito filho dispararia PageView antes de um efeito pai injetar o
 * fbq (ordem de efeitos do React é bottom-up). `initedRef` garante injeção/init
 * uma vez; o PageView dispara a cada mudança de rota.
 */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();
  const pathname = usePathname();
  const initedRef = useRef(false);

  // Captura UTM do landing — roda mesmo sem Pixel/consent (dado próprio).
  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  useEffect(() => {
    if (consent !== "granted" || !PIXEL_ID || typeof window === "undefined") return;

    if (!initedRef.current) {
      injectBaseCode();
      getFbq()?.("init", PIXEL_ID);
      initedRef.current = true;
    }

    getFbq()?.("track", "PageView");
  }, [pathname, consent]);

  return <>{children}</>;
}
