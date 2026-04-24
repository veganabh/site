/**
 * Layout do route group (order).
 *
 * Rotas de acompanhamento de pedido (ex: /pedido/[id]) usam shell do dashboard
 * SEM o painel lateral "Meu pedido" — o cliente está acompanhando um pedido já feito,
 * não montando um novo carrinho. Exibir carrinho vazio aqui confunde.
 */
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function OrderGroupLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell showOrderPanel={false}>{children}</DashboardShell>;
}
