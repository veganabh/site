/**
 * dashboard-quick-actions.tsx — Barra de atalhos do painel.
 *
 * Server Component (só Links + ícones, sem estado). Atalhos para as ações
 * mais frequentes da dona. Rola na horizontal no mobile; distribui em colunas
 * iguais no desktop.
 */

import Link from "next/link";
import { Package, Tag, Bell, Gift, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ACTIONS: QuickAction[] = [
  { href: "/gestao/cardapio/novo", label: "Novo produto", icon: Package },
  { href: "/gestao/cupons", label: "Novo cupom", icon: Tag },
  { href: "/gestao/notificacoes/nova", label: "Nova campanha", icon: Bell },
  { href: "/gestao/kits", label: "Novo kit", icon: Gift },
  { href: "/gestao/pedidos", label: "Ver pedidos", icon: ClipboardList },
];

export function DashboardQuickActions() {
  return (
    <nav
      aria-label="Atalhos rápidos"
      className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-divider bg-paper-50 px-4 py-2 text-cta whitespace-nowrap text-olive-700 transition hover:bg-paper-100 hover:text-olive-900"
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
