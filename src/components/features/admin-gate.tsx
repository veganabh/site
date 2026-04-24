"use client";

import { useDevSessionStore, ADMIN_MOCK_USER } from "@/stores/dev-session-store";
import { cn } from "@/lib/utils";

type AdminGateProps = {
  children: React.ReactNode;
};

/**
 * Guard client-side para a área de gestão.
 *
 * Lê `role` do DevSessionStore (pré-Supabase Auth).
 * Quando o login real chegar, substituir por verificação de JWT no middleware.
 *
 * Em dev: usar o botão "Entrar como admin" para acessar a área protegida.
 */
export function AdminGate({ children }: AdminGateProps) {
  const user = useDevSessionStore((s) => s.user);
  const updateUser = useDevSessionStore((s) => s.updateUser);
  const isAuthed = useDevSessionStore((s) => s.isAuthed);

  const isAdmin = isAuthed && user.role === "admin";

  if (isAdmin) return <>{children}</>;

  // Tela de bloqueio com atalho dev para entrar como admin
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
      </div>

      {/* Atalho dev — visível apenas quando não-admin */}
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-divider bg-paper-100 px-6 py-5",
          "w-full max-w-xs",
        )}
      >
        <p className="text-caption font-bold tracking-widest text-olive-700 uppercase">
          Dev — trocar sessão
        </p>
        <button
          type="button"
          onClick={() => updateUser({ ...ADMIN_MOCK_USER })}
          className="w-full rounded-sm bg-olive-900 py-2.5 text-cta font-semibold text-paper-50 transition hover:bg-olive-700"
        >
          Entrar como admin
        </button>
        <p className="text-caption text-olive-700/60">
          Botão presente apenas em ambiente de desenvolvimento.
        </p>
      </div>
    </div>
  );
}
