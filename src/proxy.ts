import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/server/supabase/middleware";

/**
 * Proxy do Next.js 16 (substitui o antigo `middleware.ts`).
 *
 * Roda em **todas as rotas** menos:
 * - assets estáticos (`_next/static`, `_next/image`, favicon, public/*)
 * - imagens (svg/png/jpg/jpeg/gif/webp)
 * - webhooks externos (`api/webhooks/**`) — não têm cookie do usuário e
 *   precisam do body cru pra validar assinatura HMAC.
 *
 * Refresha o JWT do Supabase a cada request e propaga cookies pra RSC.
 * Sem ele, o usuário fica "deslogado intermitente" depois de ~1h.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
