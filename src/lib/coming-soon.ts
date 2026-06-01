/**
 * Modo "em breve" (pré-lançamento).
 *
 * Quando ligado (env `NEXT_PUBLIC_COMING_SOON=on`), o middleware redireciona o
 * público para `/em-breve`. Gestão, autenticação, API e assets seguem livres —
 * a equipe continua validando o site enquanto o público vê a tela de espera.
 *
 * Lógica pura (sem `next/server`) pra ser testável isolada do middleware.
 */

/** Caminho da tela de espera. */
export const COMING_SOON_PATH = "/em-breve";

/**
 * Prefixos que NUNCA são bloqueados, mesmo com o modo ligado:
 * - `/gestao`   → painel interno (equipe valida)
 * - `/login`, `/cadastro` → acesso da equipe
 * - `/api`      → rotas server (webhooks de pagamento, etc.)
 * - `/conta`    → sessão da equipe logada
 * - assets internos do Next e arquivos estáticos são tratados à parte.
 */
const ALLOWED_PREFIXES = ["/gestao", "/login", "/cadastro", "/api", "/conta", COMING_SOON_PATH];

/** Modo ligado? Lê a flag pública (string "on" liga). */
export function isComingSoonEnabled(flag: string | undefined): boolean {
  return flag === "on";
}

/**
 * Decide se uma requisição GET de página deve ser redirecionada pra `/em-breve`.
 * Recebe só o pathname — assets (`/_next`, arquivos com extensão) já são
 * filtrados pelo matcher do middleware, então aqui a regra é simples:
 * bloqueia tudo que não está na allowlist.
 */
export function shouldRedirectToComingSoon(pathname: string): boolean {
  return !ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
