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
import { Button } from "@/components/ui/button";

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
        <Button
          key={href}
          asChild
          variant="secondary"
          size="md"
          className="flex-1 whitespace-nowrap text-olive-700 hover:text-olive-900"
        >
          <Link href={href}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
