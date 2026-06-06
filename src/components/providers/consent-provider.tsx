"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { readConsent, writeConsent, type Consent } from "@/lib/consent";
import { ConsentBanner } from "@/components/features/consent-banner";

type ConsentContextValue = {
  consent: Consent;
  grant: () => void;
  deny: () => void;
};

const ConsentContext = createContext<ConsentContextValue>({
  consent: "unset",
  grant: () => {},
  deny: () => {},
});

export function useConsent(): ConsentContextValue {
  return useContext(ConsentContext);
}

/**
 * Estado de consentimento LGPD (Etapa 7). Lê o cookie no mount, expõe via
 * contexto e mostra o banner enquanto indefinido. O MetaPixelProvider consome
 * `useConsent()` pra só disparar com `granted`.
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>("unset");

  // Lê o cookie só no client, pós-mount: o server sempre renderiza "unset"
  // (sem document), e sincronizamos aqui — evita hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync client-only de cookie no mount
    setConsent(readConsent());
  }, []);

  const grant = useCallback(() => {
    writeConsent("granted");
    setConsent("granted");
  }, []);

  const deny = useCallback(() => {
    writeConsent("denied");
    setConsent("denied");
  }, []);

  return (
    <ConsentContext.Provider value={{ consent, grant, deny }}>
      {children}
      {consent === "unset" && <ConsentBanner onAccept={grant} onReject={deny} />}
    </ConsentContext.Provider>
  );
}
