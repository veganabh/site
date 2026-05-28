"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/use-session";
import { useAdminSettingsStore } from "@/stores/admin-settings-store";
import { signOutAction } from "@/server/auth/actions";

// ── Mapeamento pathname → título de página ────────────────────────────────────

const PATH_TITLES: Record<string, string> = {
  "/gestao": "Painel",
  "/gestao/pedidos": "Pedidos",
  "/gestao/cardapio": "Cardápio",
  "/gestao/cupons": "Cupons",
  "/gestao/zonas": "Zonas de entrega",
  "/gestao/relatorios": "Relatórios",
  "/gestao/edicoes": "Edições Especiais",
  "/gestao/kits": "Kits de presente",
  "/gestao/configuracoes": "Configurações",
};

function getPageTitle(pathname: string): string {
  // Match exato primeiro
  if (PATH_TITLES[pathname]) return PATH_TITLES[pathname];
  // Fallback: segmentos aninhados (ex: /gestao/cardapio/123)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 2) {
    const base = `/${segments[0]}/${segments[1]}`;
    if (PATH_TITLES[base]) return PATH_TITLES[base];
  }
  return "Gestão";
}

// ── AdminTopbar ───────────────────────────────────────────────────────────────

type AdminTopbarProps = {
  /** Callback para abrir o drawer mobile da sidebar. */
  onMenuOpen: () => void;
  /**
   * Título da página a exibir no breadcrumb.
   * Se omitido, deriva automaticamente do pathname.
   */
  pageTitle?: string;
  className?: string;
};

/**
 * Topbar minimalista do painel admin.
 *
 * Contém:
 * - Botão hamburger (mobile) para abrir sidebar drawer
 * - Título/breadcrumb da página atual
 * - Pílula de status da loja (estática — integração com Passo 8 futura)
 * - Avatar da gestora + dropdown "Voltar como cliente"
 *
 * Zero elementos do site público: sem busca, sem notificações de cliente,
 * sem persona Vitória.
 */
export function AdminTopbar({ onMenuOpen, pageTitle, className }: AdminTopbarProps) {
  const pathname = usePathname() ?? "/gestao";
  const { user } = useSession();
  const storeStatus = useAdminSettingsStore((s) => s.storeStatus);

  const title = pageTitle ?? getPageTitle(pathname);
  const isAtivo = storeStatus === "ATIVO";

  const initial = (user?.firstName.charAt(0) ?? "G").toUpperCase();
  const displayName = user?.firstName || "Gestora";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-3 rounded-t-lg border-b border-divider bg-paper-50/90 px-4 backdrop-blur",
        className,
      )}
    >
      {/* Hamburger — só mobile */}
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Abrir menu de navegação"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Título da página */}
      <h1 className="flex-1 truncate text-body font-semibold text-olive-900 md:text-body-lg">
        {title}
      </h1>

      {/* Pílula de status da loja — reativa ao AdminSettingsStore (Passo 8) */}
      <div
        aria-label={isAtivo ? "Status da loja: aberta" : "Status da loja: pausada"}
        className="hidden items-center gap-1.5 rounded-full border border-divider bg-paper-100 px-3 py-1 md:inline-flex"
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isAtivo ? "bg-leaf-500" : "bg-terra-500",
          )}
          aria-hidden="true"
        />
        <span className="text-caption font-semibold text-olive-700">
          {isAtivo ? "Loja aberta" : "Loja pausada"}
        </span>
      </div>

      {/* Avatar + dropdown */}
      <div className="relative">
        <details className="group">
          <summary
            aria-label={`Menu da gestora ${displayName}`}
            className={cn(
              "flex cursor-pointer list-none items-center gap-2 rounded-full border border-divider bg-paper-50 py-1 pr-3 pl-1 transition-colors",
              "hover:bg-paper-100",
              // Remove marcador padrão do details/summary
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive-900 text-[13px] font-bold text-paper-50"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="hidden text-[13px] font-semibold text-olive-900 sm:block">
              {displayName}
            </span>
          </summary>

          {/* Dropdown */}
          <div
            className={cn(
              "absolute top-full right-0 z-30 mt-1 w-52 rounded-md border border-divider bg-paper-50 shadow-md",
              "origin-top-right",
            )}
          >
            <div className="border-b border-divider px-4 py-3">
              <p className="text-body-sm font-semibold text-olive-900">{displayName}</p>
              <p className="text-caption text-olive-700">{user?.email}</p>
            </div>
            <div className="p-1">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-terra-700 transition-colors hover:bg-terra-500/10"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sair
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
