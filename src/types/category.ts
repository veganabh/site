/**
 * Categoria de produto — gerenciável pela dona no painel.
 * Espelha a tabela `categories` (slug é o link com products.category).
 */
export type Category = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

/**
 * Label legível a partir do slug. Usa o mapa dinâmico quando disponível;
 * senão "prettifica" o slug (fallback pra categorias órfãs ou pré-hidratação).
 */
export function labelForCategory(
  slug: string,
  labelBySlug?: Record<string, string> | Map<string, string>,
): string {
  if (labelBySlug) {
    const found =
      labelBySlug instanceof Map ? labelBySlug.get(slug) : labelBySlug[slug];
    if (found) return found;
  }
  return slug
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}
