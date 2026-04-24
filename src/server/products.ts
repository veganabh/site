import type { Product, ProductCategory, ProductTag } from "@/types/product";
import { mockProducts } from "@/lib/mock-products";
import { findCollectionBySlug } from "@/lib/mock-collections";

export async function listProducts(opts?: {
  category?: ProductCategory;
  tag?: ProductTag;
  collection?: string;
  onlyActive?: boolean;
  query?: string;
}): Promise<Product[]> {
  let data: readonly Product[] = mockProducts;
  if (opts?.onlyActive ?? true) data = data.filter((p) => p.active);

  // Coleção customizada tem prioridade: filtra + preserva a ordem dos productIds.
  if (opts?.collection) {
    const col = findCollectionBySlug(opts.collection);
    if (!col) return [];
    const byId = new Map(data.map((p) => [p.id, p]));
    data = col.productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  } else {
    if (opts?.category) data = data.filter((p) => p.category === opts.category);
    if (opts?.tag) data = data.filter((p) => p.tags.includes(opts.tag!));
  }

  const q = opts?.query?.trim().toLowerCase();
  if (q) {
    data = data.filter((p) => {
      const haystack = [
        p.name,
        p.description,
        p.category,
        ...p.tags,
        ...p.attributes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return [...data];
}

/**
 * Busca um produto pelo slug. Retorna `null` se não existir ou estiver inativo.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return mockProducts.find((p) => p.slug === slug && p.active) ?? null;
}
