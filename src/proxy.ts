import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/server/supabase/middleware";
import {
  isComingSoonEnabled,
  shouldRedirectToComingSoon,
  COMING_SOON_PATH,
} from "@/lib/coming-soon";

/**
 * Proxy do Next.js 16 (substitui o antigo `middleware.ts`).
 *
 * Roda em **todas as rotas** menos:
 * - assets estáticos (`_next/static`, `_next/image`, favicon, public/*)
 * - imagens (svg/png/jpg/jpeg/gif/webp)
 * - webhooks externos (`api/webhooks/**`) — não têm cookie do usuário e
 *   precisam do body cru pra validar assinatura HMAC.
 *
 * Faz duas coisas, nesta ordem:
 * 1. **Modo "em breve"** (pré-lançamento): se `NEXT_PUBLIC_COMING_SOON=on`,
 *    redireciona o público pra `/em-breve`. Gestão/login/API/conta seguem
 *    livres (allowlist em `lib/coming-soon`). Desligar no lançamento = mudar
 *    a env pra `off` no Vercel, sem deploy de código.
 * 2. **Sessão Supabase**: refresha o JWT a cada request e propaga cookies pra
 *    RSC. Sem isso o usuário fica "deslogado intermitente" depois de ~1h.
 */
export async function proxy(request: NextRequest) {
  if (
    isComingSoonEnabled(process.env.NEXT_PUBLIC_COMING_SOON) &&
    shouldRedirectToComingSoon(request.nextUrl.pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = COMING_SOON_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
