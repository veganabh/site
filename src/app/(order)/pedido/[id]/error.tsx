"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error.message);
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-serif text-h2 text-olive-900 italic">Algo deu errado aqui.</h1>
      <p className="mt-3 text-body-sm text-olive-700">
        A gente tá de olho — tenta de novo em instantes.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-pill bg-olive-900 px-6 py-2.5 text-body-sm font-semibold text-paper-50 transition hover:bg-olive-700"
        >
          Tentar de novo
        </button>
        <Link
          href="/conta"
          className="rounded-pill border border-divider px-6 py-2.5 text-body-sm font-semibold text-olive-900 transition hover:bg-paper-100"
        >
          Voltar pra conta
        </Link>
      </div>
    </main>
  );
}
