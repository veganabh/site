import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/layout/footer";

/**
 * Casca leve para páginas institucionais (privacidade, termos, contato).
 * Sem sidebar/carrinho — coluna de leitura centrada + rodapé.
 */
export default function InstitucionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper-100/50">
      <header className="border-b border-divider bg-paper-50">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="Veg.ana — início" className="inline-flex items-center">
            <img src="/logo.svg" alt="Veg.ana" className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-olive-700 transition-colors hover:text-olive-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar ao cardápio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-12">{children}</main>

      <Footer />
    </div>
  );
}
