"use client";

import { useEffect } from "react";

/**
 * Registra o Service Worker (/sw.js) que torna a Veg.ana instalável e dá
 * fallback offline. Só em produção — em dev o SW atrapalha o HMR e pode servir
 * assets em cache. Sem UI.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Falha de registro não deve quebrar a app — segue sem SW.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
