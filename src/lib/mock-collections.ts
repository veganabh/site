import { Gift } from "lucide-react";
import type { CustomCollection } from "@/types/collection";

/**
 * Super-categorias customizadas — curadorias editoriais.
 * Cada coleção aponta pra productIds de categorias reais (sem duplicar estoque).
 *
 * Para adicionar nova coleção:
 *   1. Criar item aqui com icon do lucide-react
 *   2. Listar productIds na ordem de exibição desejada
 *   3. Coleção aparece automaticamente ao lado de "Festa à vista?" no chip bar
 */
export const mockCollections: readonly CustomCollection[] = [
  {
    id: "col-presentear",
    slug: "presentear",
    name: "Para Presentear",
    tagline: "Doces que viajam bonito até a casa de quem você gosta",
    icon: Gift,
    productIds: ["4", "5", "10", "11"], // brownie, bombom, beijinho, brigadeiro gourmet
  },
];

export function findCollectionBySlug(slug: string): CustomCollection | undefined {
  return mockCollections.find((c) => c.slug === slug);
}
