"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminNavItemProps = {
  /** Rota de destino. Ignorada quando `disabled` é true. */
  href: string;
  /** Label visível do item. */
  label: string;
  /** Ícone Lucide (componente React). */
  icon: React.ElementType;
  /** Se true, item recebe estilo ativo e aria-current="page". */
  active?: boolean;
  /**
   * Número a exibir no badge. Omitir ou passar 0 para ocultar.
   * Trunca em "9+" quando > 9.
   */
  badge?: number;
  /**
   * Se true, item fica opaco + cursor-not-allowed e não navega.
   * Usado para módulos "em construção".
   */
  disabled?: boolean;
  /** Callback opcional — útil para fechar drawer mobile após navegação. */
  onClick?: () => void;
  /**
   * Se true, renderiza só o ícone centralizado (modo rail).
   * Label fica oculto visualmente mas permanece no aria-label + sr-only.
   */
  collapsed?: boolean;
  className?: string;
};

/**
 * Item da nav lateral do admin.
 *
 * - Estado ativo: highlight fundo olive-900 + texto paper-50.
 * - Badge: pílula terra-500 no canto superior direito do ícone.
 * - Disabled: opacidade 40%, cursor-not-allowed, renderiza span em vez de Link.
 * - Acessibilidade: aria-current="page" no ativo, aria-disabled + tooltip no disabled.
 */
export function AdminNavItem({
  href,
  label,
  icon: Icon,
  active = false,
  badge = 0,
  disabled = false,
  onClick,
  collapsed = false,
  className,
}: AdminNavItemProps) {
  const badgeCount = Math.max(0, Math.floor(badge));
  const showBadge = badgeCount > 0;
  const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);

  const inner = (
    <>
      {/* Ícone + badge */}
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={active ? 2.25 : 1.75} />
        {showBadge && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-500 px-0.5 text-[9px] leading-none font-bold text-paper-50"
          >
            {badgeLabel}
          </span>
        )}
      </span>

      {/* Label — escondido no modo collapsed */}
      {!collapsed && <span className="text-body-sm leading-tight font-medium">{label}</span>}

      {/* Badge acessível (fora do ícone, lido pelo screen reader) */}
      {showBadge && (
        <span className="sr-only">
          — {badgeCount} {badgeCount === 1 ? "pedido novo" : "pedidos novos"}
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "flex items-center rounded-md transition-colors",
    collapsed ? "h-10 w-10 justify-center self-center" : "w-full gap-3 px-3 py-2",
    active
      ? "bg-olive-900 text-paper-50 shadow-sm"
      : "text-olive-700 hover:bg-paper-100 hover:text-olive-900",
    disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-olive-700",
    className,
  );

  if (disabled) {
    return (
      <span
        role="link"
        aria-disabled="true"
        title={`${label} — em construção`}
        className={baseClass}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={
        showBadge
          ? `${label} — ${badgeCount} ${badgeCount === 1 ? "pedido novo" : "pedidos novos"}`
          : label
      }
      title={collapsed ? label : undefined}
      className={baseClass}
      onClick={onClick}
    >
      {inner}
    </Link>
  );
}
