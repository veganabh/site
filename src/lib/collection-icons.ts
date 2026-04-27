/**
 * Mapa de ícones para coleções (super-categorias curadas).
 *
 * Collection.icon é LucideIcon (componente React) — não serializável; o
 * DB persiste icon_name (string) e o cliente resolve via este mapa.
 *
 * Para adicionar ícone: inserir em COLLECTION_ICON_NAMES e em COLLECTION_ICONS.
 */

import { Gift, Heart, Sparkles, Cake, Cookie, Star, PartyPopper, Snowflake } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const COLLECTION_ICON_NAMES = [
  "Gift",
  "Heart",
  "Sparkles",
  "Cake",
  "Cookie",
  "Star",
  "PartyPopper",
  "Snowflake",
] as const;

export type CollectionIconName = (typeof COLLECTION_ICON_NAMES)[number];

export const COLLECTION_ICONS: Record<CollectionIconName, LucideIcon> = {
  Gift,
  Heart,
  Sparkles,
  Cake,
  Cookie,
  Star,
  PartyPopper,
  Snowflake,
};

export function isCollectionIconName(value: string): value is CollectionIconName {
  return (COLLECTION_ICON_NAMES as readonly string[]).includes(value);
}

/**
 * Resolve o nome do ícone para o componente LucideIcon.
 * Fallback para Gift se o nome não for reconhecido.
 */
export function resolveCollectionIcon(name: string): LucideIcon {
  return isCollectionIconName(name) ? COLLECTION_ICONS[name] : Gift;
}
