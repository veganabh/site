import type { ProductAttribute, ProductCategory, ProductContains } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  "bolo-no-pote": "Bolos no Pote",
  bolo: "Bolos",
  docinho: "Docinhos",
  "edicao-especial": "Edições Especiais",
};

export const ATTRIBUTE_LABEL: Record<ProductAttribute, string> = {
  "sem-lactose": "sem lactose",
  vegano: "vegano",
  "sem-gluten": "sem glúten",
  "sem-ovo": "sem ovo",
};

export const CONTAINS_LABEL: Record<ProductContains, string> = {
  "castanha-de-caju": "castanha",
  coco: "coco",
  cacau: "cacau",
  soja: "soja",
  amendoim: "amendoim",
  trigo: "trigo",
};

/**
 * Narrowing seguro para strings vindas de searchParams.
 */
export function isProductCategory(raw: string | undefined): raw is ProductCategory {
  if (!raw) return false;
  return (PRODUCT_CATEGORIES as readonly string[]).includes(raw);
}

/**
 * Categorias visíveis nos chips. `edicao-especial` não aparece até termos
 * produto nessa categoria.
 */
export const VISIBLE_CATEGORIES: readonly ProductCategory[] = ["bolo-no-pote", "bolo", "docinho"];
