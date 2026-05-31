import Image from "next/image";
import Link from "next/link";

import { AuthBrandAside } from "@/components/auth/auth-brand-panel";

/**
 * Layout das páginas /login e /cadastro. Standalone — sem sidebar de conta
 * nem shell de gestão.
 *
 * Fullscreen sem scroll (`h-dvh overflow-hidden`): foto de produto cobre a
 * tela toda, overlay olive garante legibilidade. Por cima: bloco de marca à
 * esquerda (desktop) e o card de auth à direita. No mobile o card centraliza
 * sobre a foto (o aside some). O card em si controla o conteúdo (abas
 * Entrar/Criar conta) — ver `AuthCard`.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-olive-900">
      {/* Foto fullscreen */}
      <Image
        src="/produtos/bolo-cenoura-brigadeiro.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Overlay: escurece pra contraste do texto claro + do card branco */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-olive-900/92 via-olive-900/75 to-olive-900/85"
      />

      {/* Logo — canto superior esquerdo, monocromático claro sobre a foto */}
      <Link
        href="/"
        aria-label="Voltar pra home Veg.ana"
        className="absolute top-6 left-6 z-20 lg:top-8 lg:left-10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Veg.ana" className="h-8 w-auto brightness-0 invert" />
      </Link>

      {/* Conteúdo: aside de marca + card */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center justify-center gap-10 px-6 lg:justify-between lg:px-12">
        <AuthBrandAside />
        <div className="w-full max-w-md shrink-0">{children}</div>
      </div>
    </div>
  );
}
