/**
 * Layout do route group (gestao).
 *
 * Rotas de gestão não exibem o painel "Meu pedido" — ele faz sentido
 * para o cliente final, não para a gestora no painel administrativo.
 * O conteúdo ocupa a largura total disponível (sidebar à esquerda, sem coluna direita).
 *
 * max-w-screen-2xl garante que o texto não estica em monitores ultra-wide.
 */
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function GestaoGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell showOrderPanel={false}>
      <div className="mx-auto w-full max-w-screen-2xl">
        {children}
      </div>
    </DashboardShell>
  );
}
