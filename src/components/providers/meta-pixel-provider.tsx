"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { captureUtmFromUrl } from "@/lib/tracking";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Acessor tipado do `fbq` injetado no window. undefined antes do base code. */
function getFbq(): ((...args: unknown[]) => void) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.fbq as ((...args: unknown[]) => void) | undefined;
}

/**
 * Inicializa o Meta Pixel (fbevents.js) e dispara `PageView` em cada mudança de
 * rota — espelho do `PostHogProvider`.
 *
 * Dormente sem `NEXT_PUBLIC_META_PIXEL_ID` — nada roda até a env existir.
 *
 * Estratégia: o base code do Pixel cria um `fbq` que ENFILEIRA chamadas até o
 * script carregar; por isso `init` + `track` disparados logo já ficam na fila.
 * Não disparamos PageView no init — deixamos o efeito de `pathname` cuidar disso
 * (mesma lógica do PostHog: `capture_pageview:false` + pageview manual), evitando
 * PageView duplicado no primeiro carregamento.
 *
 * TODO (Etapa 7 — LGPD): gatear o disparo atrás de consentimento de cookies.
 * Base do Pixel suporta `fbq("consent","revoke")` antes do aceite.
 */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  // Captura UTM do landing — roda mesmo sem Pixel (atribuição independe da Meta).
  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  // Injeta o base code uma vez.
  useEffect(() => {
    if (!PIXEL_ID || typeof window === "undefined" || getFbq()) return;

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

    getFbq()?.("init", PIXEL_ID);
  }, []);

  return <MetaPixelTracker>{children}</MetaPixelTracker>;
}

function MetaPixelTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // PageView manual a cada navegação (e no primeiro mount).
  useEffect(() => {
    const fbq = getFbq();
    if (!PIXEL_ID || !fbq) return;
    fbq("track", "PageView");
  }, [pathname]);

  return <>{children}</>;
}
