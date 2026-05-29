"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GestaoError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Nunca logar PII — só a mensagem genérica do erro
    console.error("[gestao]", error.message);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-h2 font-bold text-olive-900">Algo não carregou direito.</h1>
      <p className="mt-4 text-body text-olive-700">
        Pode ser passageiro — tenta de novo e, se persistir, fala com o time.
      </p>
      <Button variant="primary" size="md" onClick={reset} className="mt-8">
        Tentar de novo
      </Button>
    </main>
  );
}
