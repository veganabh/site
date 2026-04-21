"use client";

import { useEffect } from "react";

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
      <h1 className="text-h2 font-bold text-olive-900">
        Algo não carregou direito.
      </h1>
      <p className="mt-4 text-body text-olive-700">
        Pode ser passageiro — tenta de novo e, se persistir, fala com o time.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-sm bg-olive-900 px-6 py-3 text-cta text-paper-50 transition hover:bg-olive-700"
      >
        Tentar de novo
      </button>
    </main>
  );
}
