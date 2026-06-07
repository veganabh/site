"use client";

import Link from "next/link";

type Props = {
  onAccept: () => void;
  onReject: () => void;
};

/**
 * Banner de consentimento de cookies de marketing (LGPD — Etapa 7).
 * Aparece só enquanto a escolha está indefinida. Tom: afetivo, concreto, sem
 * juridiquês (Brand Voice Guide).
 */
export function ConsentBanner({ onAccept, onReject }: Props) {
  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-divider bg-paper-50 shadow-sm"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-olive-900">
          A gente usa cookies pra entender o que funciona e deixar sua experiência melhor por aqui.{" "}
          <Link
            href="/privacidade"
            className="font-semibold text-olive-900 underline transition-colors hover:text-terra-700"
          >
            Como usamos
          </Link>{" "}
          💚
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onReject}
            className="rounded-full border border-divider px-4 py-1.5 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-full bg-terra-500 px-4 py-1.5 text-caption font-bold text-paper-50 shadow-sm transition-transform active:scale-[0.98]"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
