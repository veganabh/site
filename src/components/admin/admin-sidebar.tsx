"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Package,
  Tag,
  MapPin,
  BarChart2,
  Sparkles,
  Gift,
  Bell,
  SlidersHorizontal,
  ExternalLink,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAdminOrdersStore } from "@/stores/admin-orders-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { AdminNavItem } from "@/components/admin/admin-nav-item";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/auth/actions";

// ── Definição dos módulos de nav ──────────────────────────────────────────────

type NavModule = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Se true, exibe badge com contagem de pedidos novos. */
  showOrderBadge?: boolean;
  /** Se true, item fica desabilitado (módulo em construção). */
  disabled?: boolean;
};

type NavSection = {
  /** Rótulo da seção (oculto no modo rail colapsado). */
  label: string;
  items: NavModule[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Operação",
    items: [
      { href: "/gestao", label: "Painel", icon: LayoutDashboard },
      { href: "/gestao/pedidos", label: "Pedidos", icon: ClipboardList, showOrderBadge: true },
      { href: "/gestao/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/gestao/cardapio", label: "Cardápio", icon: Package },
      { href: "/gestao/kits", label: "Kits de presente", icon: Gift },
      { href: "/gestao/edicoes", label: "Edições Especiais", icon: Sparkles, disabled: true },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/gestao/cupons", label: "Cupons", icon: Tag },
      { href: "/gestao/notificacoes", label: "Notificações", icon: Bell },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/gestao/zonas", label: "Zonas", icon: MapPin },
      { href: "/gestao/relatorios", label: "Relatórios", icon: BarChart2 },
      { href: "/gestao/configuracoes", label: "Configurações", icon: SlidersHorizontal },
    ],
  },
];

// ── SidebarContent (reutilizado por desktop + drawer mobile) ──────────────────

type SidebarContentProps = {
  onClose?: () => void;
  /** Se true, renderiza em modo rail (ícones-only). Só usado no desktop. */
  collapsed?: boolean;
  /** Callback pra alternar colapso. Só relevante no desktop. */
  onToggleCollapse?: () => void;
};

function SidebarContent({ onClose, collapsed = false, onToggleCollapse }: SidebarContentProps) {
  const pathname = usePathname() ?? "/gestao";
  // Conta NOVO do DIA — alinha com o kanban /gestao/pedidos (escopo "do dia").
  // Sem o filtro de data, pedidos-teste antigos inflavam o badge enquanto o
  // kanban ficava vazio (createdAt < hoje).
  const newOrderCount = useAdminOrdersStore((s) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return s.orders.filter((o) => o.status === "NOVO" && new Date(o.createdAt) >= start).length;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho: logo + toggle (desktop) ou logo + fechar (drawer mobile) */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-divider",
          collapsed ? "justify-center px-2" : "justify-between gap-3 px-4",
        )}
      >
        <Link
          href="/gestao"
          aria-label="Veg.ana Gestão — ir para o Painel"
          className="flex items-center rounded-sm p-1 transition-colors hover:bg-paper-100"
          onClick={onClose}
        >
          {collapsed ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-olive-900 text-paper-50"
              aria-hidden="true"
            >
              <LeafMark className="h-5 w-5" />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.svg" alt="Veg.ana" className="h-8 w-auto" />
          )}
        </Link>

        {/* Toggle desktop — só aparece quando expandido */}
        {!collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="hidden h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 md:flex"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        {/* Fechar — só no drawer mobile */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 md:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav principal — agrupada por seção */}
      <nav
        aria-label="Módulos da gestão"
        className={cn(
          "flex flex-1 flex-col overflow-y-auto py-4",
          collapsed ? "items-center gap-2 px-2" : "gap-1 px-3",
        )}
      >
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.label}
            className={cn(
              "flex flex-col gap-1",
              collapsed ? "w-full items-center" : "",
              // Separação entre grupos
              !collapsed && sectionIndex > 0 && "mt-3",
            )}
          >
            {collapsed ? (
              // Rail: divisor no lugar do rótulo (exceto antes do 1º grupo)
              sectionIndex > 0 && <span aria-hidden="true" className="my-1 h-px w-7 bg-divider" />
            ) : (
              <span className="px-3 pb-1 text-micro font-semibold tracking-wide text-olive-700 uppercase">
                {section.label}
              </span>
            )}

            {section.items.map((mod) => {
              const isActive =
                mod.href === "/gestao" ? pathname === "/gestao" : pathname.startsWith(mod.href);
              const badge = mod.showOrderBadge ? newOrderCount : 0;

              return (
                <AdminNavItem
                  key={mod.href}
                  href={mod.href}
                  label={mod.label}
                  icon={mod.icon}
                  active={isActive}
                  badge={badge}
                  disabled={mod.disabled}
                  collapsed={collapsed}
                  onClick={onClose}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div
        className={cn(
          "flex flex-col gap-1 border-t border-divider py-4",
          collapsed ? "items-center px-2" : "px-3",
        )}
      >
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir loja pública em nova aba"
          title={collapsed ? "Ver loja pública" : undefined}
          className={cn(
            "flex items-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900",
            collapsed ? "h-10 w-10 justify-center" : "w-full gap-3 px-3 py-2",
          )}
          onClick={onClose}
        >
          <ExternalLink
            className="h-[18px] w-[18px] shrink-0"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          {!collapsed && <span className="text-body-sm font-medium">Ver loja pública</span>}
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            onClick={() => onClose?.()}
            aria-label="Sair do painel admin"
            title={collapsed ? "Sair" : undefined}
            className={cn(
              "flex items-center rounded-sm text-terra-700 transition-colors hover:bg-terra-500/10 hover:text-terra-700",
              collapsed ? "h-10 w-10 justify-center" : "w-full gap-3 px-3 py-2",
            )}
          >
            <svg
              className="h-[18px] w-[18px] shrink-0"
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
            {!collapsed && <span className="text-body-sm font-medium">Sair</span>}
          </button>
        </form>

        {/* Toggle fica no rodapé quando collapsed */}
        {collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expandir menu"
            title="Expandir menu"
            className="mt-1 hidden h-8 w-8 items-center justify-center self-center rounded-sm text-olive-700 transition-colors hover:bg-paper-100 hover:text-olive-900 md:flex"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── AdminSidebar (desktop + drawer mobile) ────────────────────────────────────

type AdminSidebarProps = {
  /** Controla visibilidade do drawer mobile. */
  drawerOpen: boolean;
  /** Callback para fechar o drawer. */
  onDrawerClose: () => void;
};

/**
 * Sidebar do painel admin.
 *
 * Desktop (md+): colapsável — expanded (w-60) ou rail (w-16).
 * Estado persiste em `useSidebarStore.adminExpanded`.
 * Mobile: drawer off-canvas disparado pelo hamburger da AdminTopbar.
 */
export function AdminSidebar({ drawerOpen, onDrawerClose }: AdminSidebarProps) {
  const expanded = useSidebarStore((s) => s.adminExpanded);
  const toggleExpanded = useSidebarStore((s) => s.toggleAdmin);

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        aria-label="Navegação do painel"
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-divider bg-paper-50 transition-[width] duration-200 ease-out md:flex",
          expanded ? "w-60" : "w-16",
        )}
      >
        <SidebarContent collapsed={!expanded} onToggleCollapse={toggleExpanded} />
      </aside>

      {/* Drawer mobile — off-canvas (sempre expandido no drawer) */}
      {drawerOpen && (
        <>
          <div
            role="presentation"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm md:hidden"
            onClick={onDrawerClose}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navegação do painel"
            className="fixed inset-y-0 left-0 z-50 w-72 bg-paper-50 shadow-lg md:hidden"
          >
            <SidebarContent onClose={onDrawerClose} />
          </aside>
        </>
      )}
    </>
  );
}

/**
 * Hook para controlar o estado do drawer mobile da sidebar admin.
 */
export function useAdminDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return {
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
  };
}

// ── LeafMark (usado apenas no rail colapsado) ─────────────────────────────────

function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 20c0-8 6-14 16-16-1 9-6 15-14 16-.8.1-1.3-.6-1.1-1.3l2-5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
