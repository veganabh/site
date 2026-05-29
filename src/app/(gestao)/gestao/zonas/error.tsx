"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ZonasError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[/gestao/zonas]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-8 w-8 text-terra-500" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 font-bold text-olive-900">Algo deu errado</h2>
        <p className="text-body-sm text-olive-700">
          Não foi possível carregar o módulo de zonas. Tente novamente.
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
