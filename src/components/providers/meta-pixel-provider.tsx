"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { captureUtmFromUrl } from "@/lib/tracking";
import { useConsent } from "@/components/providers/consent-provider";

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
 * LGPD (Etapa 7): só injeta/dispara com `consent === "granted"`. Sem aceite, o
 * Pixel nunca carrega (gate mais estrito que `consent:revoke`). Ao aceitar, o
 * efeito reage e injeta + dispara o PageView atual.
 *
 * Estratégia: o base code do Pixel cria um `fbq` que ENFILEIRA chamadas até o
 * script carregar; por isso `init` + `track` disparados logo já ficam na fila.
 * Não disparamos PageView no init — deixamos o efeito de `pathname` cuidar disso
 * (mesma lógica do PostHog: `capture_pageview:false` + pageview manual), evitando
 * PageView duplicado no primeiro carregamento.
 */
export function MetaPixelProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();

  // Captura UTM do landing — roda mesmo sem Pixel/consent (atribuição é dado
  // próprio, não compartilhado com a Meta).
  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  // Injeta o base code uma vez, só após consentimento.
  useEffect(() => {
    if (consent !== "granted" || !PIXEL_ID || typeof window === "undefined" || getFbq()) return;

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
  }, [consent]);

  return <MetaPixelTracker>{children}</MetaPixelTracker>;
}

function MetaPixelTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { consent } = useConsent();

  // PageView manual a cada navegação (e logo após o aceite).
  useEffect(() => {
    if (consent !== "granted") return;
    const fbq = getFbq();
    if (!PIXEL_ID || !fbq) return;
    fbq("track", "PageView");
  }, [pathname, consent]);

  return <>{children}</>;
}
