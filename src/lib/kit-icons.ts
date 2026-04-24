/**
 * Mapa de ícones para templates de kit de presente.
 *
 * GiftKitTemplate.icon é LucideIcon (componente React) — não serializável.
 * A store admin persiste iconName (string) e resolve via este mapa no consumo.
 *
 * Para adicionar ícone: inserir em GIFT_KIT_ICON_NAMES e em GIFT_KIT_ICONS.
 */

import { Gift, Heart, Users, Sparkles, Cake, Cookie } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const GIFT_KIT_ICON_NAMES = [
  "Gift",
  "Heart",
  "Users",
  "Sparkles",
  "Cake",
  "Cookie",
] as const;

export type GiftKitIconName = (typeof GIFT_KIT_ICON_NAMES)[number];

export const GIFT_KIT_ICONS: Record<GiftKitIconName, LucideIcon> = {
  Gift,
  Heart,
  Users,
  Sparkles,
  Cake,
  Cookie,
};

/**
 * Resolve o nome do ícone para o componente LucideIcon.
 * Fallback para Gift se o nome não for reconhecido (nunca deve acontecer em produção).
 */
export function resolveKitIcon(name: GiftKitIconName): LucideIcon {
  return GIFT_KIT_ICONS[name] ?? Gift;
}
