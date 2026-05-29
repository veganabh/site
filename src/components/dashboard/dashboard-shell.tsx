import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { OrderDetailPanel } from "@/components/dashboard/order-detail-panel";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { MiniCartBar } from "@/components/layout/mini-cart-bar";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  /** Se false, o painel direito "Meu pedido" não renderiza (ex: /conta). */
  showOrderPanel?: boolean;
  /** Substitui o OrderDetailPanel padrão por um painel customizado. */
  rightPanel?: React.ReactNode;
  className?: string;
};

/**
 * Casca do dashboard — grid de 3 colunas em xl (sidebar + main + order panel).
 * Em telas menores, o sidebar vira BottomNav e o order panel desaparece.
 */
export function DashboardShell({
  children,
  showOrderPanel = true,
  rightPanel,
  className,
}: DashboardShellProps) {
  return (
    <div className={cn("flex min-h-screen bg-paper-100/50", className)}>
      <Sidebar />
      <div className="mx-auto flex w-full flex-1 flex-col pb-44 md:pb-0">
        <div className="mx-auto flex w-full flex-1 flex-col px-2 py-2 md:px-3 md:py-3">
          <div className="mx-auto flex w-full flex-1 flex-col rounded-lg border border-divider bg-paper-50 shadow-sm">
            <TopBar />
            <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
              <main className="min-w-0 flex-1 px-3 pt-3 pb-8 md:px-5 md:pt-4">{children}</main>
              {rightPanel ?? (showOrderPanel && <OrderDetailPanel />)}
            </div>
          </div>
        </div>
        <Footer />
      </div>
      <MiniCartBar />
      <BottomNav />
    </div>
  );
}
