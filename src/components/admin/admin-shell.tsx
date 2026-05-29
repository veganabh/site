"use client";

import { AdminSidebar, useAdminDrawer } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { Card } from "@/components/ui/card";

type AdminShellProps = {
  children: React.ReactNode;
  /**
   * Título opcional da página para a topbar.
   * Se omitido, a AdminTopbar deriva do pathname automaticamente.
   */
  pageTitle?: string;
};

/**
 * Chrome completo da área admin — substitui o DashboardShell em /gestao/*.
 *
 * Layout (espelha o DashboardShell público):
 * - Sidebar colapsável à esquerda (rail 64px ou expandida 240px)
 * - Conteúdo principal envolvido em card arredondado `bg-paper-50` com topbar
 *   dentro, sobre fundo `bg-paper-100/50` (efeito rail+card).
 * - Mobile: topbar com hamburger + drawer off-canvas pro sidebar.
 *
 * AdminGate permanece no layout do route group — não duplica aqui.
 * BottomNav público não é renderizado.
 */
export function AdminShell({ children, pageTitle }: AdminShellProps) {
  const { drawerOpen, openDrawer, closeDrawer } = useAdminDrawer();
  useOrdersRealtime();

  return (
    <div className="flex min-h-screen bg-paper-100/50">
      {/* Sidebar */}
      <AdminSidebar drawerOpen={drawerOpen} onDrawerClose={closeDrawer} />

      {/* Área principal com card arredondado */}
      <div className="mx-auto flex w-full flex-1 flex-col">
        <div className="mx-auto flex w-full flex-1 flex-col px-2 py-2 md:px-3 md:py-3">
          <Card padding="none" className="flex w-full flex-1 flex-col">
            <AdminTopbar onMenuOpen={openDrawer} pageTitle={pageTitle} />
            <main className="min-w-0 flex-1 px-3 pt-3 pb-8 md:px-5 md:pt-4 md:pb-10">
              <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
            </main>
          </Card>
        </div>
      </div>
    </div>
  );
}
