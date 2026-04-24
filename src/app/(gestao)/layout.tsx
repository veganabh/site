/**
 * Layout do route group (gestao).
 *
 * Gate de acesso: apenas usuários com role "admin" acessam esta área.
 * Em produção será substituído por middleware Next.js + JWT Supabase.
 * Hoje lê o useDevSessionStore via AdminGate (client component).
 *
 * Usa AdminShell — chrome próprio da área admin — em vez do DashboardShell público.
 * O AdminShell não herda sidebar de cliente, topbar pública, BottomNav nem MiniCartBar.
 */
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminGate } from "@/components/features/admin-gate";

export default function GestaoGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <AdminGate>{children}</AdminGate>
    </AdminShell>
  );
}
