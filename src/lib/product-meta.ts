import type { ProductAttribute, ProductContains } from "@/types/product";

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
