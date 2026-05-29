import { Cookie, CakeSlice, Candy, Croissant } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Ícone para uma categoria dinâmica (tabela `categories`). Categorias não têm
 * ícone fixo no banco — inferimos por palavra-chave do slug/nome. Fallback:
 * Cookie (doce genérico). Mantém a vitrine consistente quando a dona cria
 * categorias novas pelo painel.
 */
export function iconForCategory(slugAndName: string): LucideIcon {
  const s = slugAndName.toLowerCase();
  if (s.includes("pote")) return Cookie;
  if (s.includes("bolo")) return CakeSlice;
  if (
    s.includes("salg") ||
    s.includes("congelad") ||
    s.includes("tortinha") ||
    s.includes("quiche") ||
    s.includes("empad") ||
    s.includes("croquete") ||
    s.includes("quibe") ||
    s.includes("risole") ||
    s.includes("snack")
  ) {
    return Croissant;
  }
  if (s.includes("docinho") || s.includes("bombom") || s.includes("doce")) return Candy;
  return Cookie;
}
