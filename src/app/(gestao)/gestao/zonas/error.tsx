"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

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
      <button
        type="button"
        onClick={reset}
        className="rounded-sm bg-olive-900 px-4 py-2 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-olive-700"
      >
        Tentar novamente
      </button>
    </div>
  );
}
