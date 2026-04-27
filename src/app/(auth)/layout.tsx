import Link from "next/link";

/**
 * Layout das páginas /login e /cadastro. Standalone — sem sidebar de conta
 * nem shell de gestão. Centraliza o form e exibe o logo no topo.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-100">
      <header className="flex items-center justify-center border-b border-divider bg-paper-50 py-4">
        <Link href="/" aria-label="Voltar pra home Veg.ana">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Veg.ana" className="h-8 w-auto" />
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-6 md:py-12">{children}</div>
    </div>
  );
}
