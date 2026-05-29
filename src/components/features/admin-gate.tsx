"use client";

import Link from "next/link";

import { useSession } from "@/lib/auth/use-session";

type AdminGateProps = {
  children: React.ReactNode;
};

/**
 * Guard client-side da área de gestão.
 *
 * Lê `role` da sessão real (Supabase). É a segunda camada — o layout
 * `(gestao)` já checa role no servidor e redireciona não-admins.
 * Aqui só protege contra hidratação stale.
 */
export function AdminGate({ children }: AdminGateProps) {
  const { status, user } = useSession();

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[60vh] items-center justify-center px-4"
      >
        <span className="text-body-sm text-olive-700">Carregando…</span>
      </div>
    );
  }

  if (user?.role === "admin") return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-100 text-2xl"
          aria-hidden="true"
        >
          🔒
        </span>
        <h1 className="text-h3 font-bold text-olive-900">Acesso restrito</h1>
        <p className="max-w-xs text-body-sm text-olive-700">
          Esta área é exclusiva para administradoras da Veg.ana.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-terra-500 px-5 text-body-sm font-semibold text-paper-50 hover:bg-terra-700"
        >
          Voltar pra home
        </Link>
      </div>
    </div>
  );
}
