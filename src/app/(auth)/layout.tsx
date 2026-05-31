import Link from "next/link";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

/**
 * Layout das páginas /login e /cadastro. Standalone — sem sidebar de conta
 * nem shell de gestão.
 *
 * Split-screen no desktop (≥lg): painel de marca imersivo à esquerda, coluna
 * de formulário à direita. No mobile colapsa numa coluna única; o calor da
 * marca volta via `AuthBrandBanner` (renderizado por cada form).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper-100">
      {/* Painel de marca — só desktop */}
      <AuthBrandPanel />

      {/* Coluna do formulário */}
      <div className="flex flex-1 flex-col">
        {/* Logo sempre sobre fundo claro (contraste garantido) */}
        <header className="flex items-center justify-center border-b border-divider bg-paper-50 py-4">
          <Link href="/" aria-label="Voltar pra home Veg.ana">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Veg.ana" className="h-8 w-auto" />
          </Link>
        </header>

        <div className="flex flex-1 items-start justify-center px-4 py-6 md:py-10 lg:items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
