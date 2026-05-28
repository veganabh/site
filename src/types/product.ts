/**
 * Slugs das categorias originais (seed). NÃO é mais a fonte da verdade —
 * categorias agora vivem na tabela `categories` (gerenciáveis pela dona).
 * Mantido como fallback de labels e default em formulários.
 */
export const PRODUCT_CATEGORIES = ["bolo-no-pote", "bolo", "docinho", "edicao-especial"] as const;

/**
 * Categoria de produto = slug (string). Antes era union fechado; agora é
 * dinâmico (tabela `categories`). Validação de existência acontece via
 * categories-store (client) ou listCategories (server), não no tipo.
 */
export type ProductCategory = string;

export const PRODUCT_ATTRIBUTES = ["sem-lactose", "vegano", "sem-gluten", "sem-ovo"] as const;

export type ProductAttribute = (typeof PRODUCT_ATTRIBUTES)[number];

/**
 * Ingredientes/alérgenos PRESENTES no produto (oposto de attributes).
 * Crítico pra inclusão cruzada: intolerante à castanha decide por ausência,
 * não por rótulo "vegano".
 */
export const PRODUCT_CONTAINS = [
  "castanha-de-caju",
  "coco",
  "cacau",
  "soja",
  "amendoim",
  "trigo",
] as const;

export type ProductContains = (typeof PRODUCT_CONTAINS)[number];

export type ProductPhoto = {
  url: string;
  alt: string;
};

export const PRODUCT_TAGS = ["favoritos", "novidades", "presente", "afetivos"] as const;
export type ProductTag = (typeof PRODUCT_TAGS)[number];

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  gramatura_g: number;
  price_site: number;
  price_ifood: number;
  attributes: readonly ProductAttribute[];
  tags: readonly ProductTag[];
  photo: ProductPhoto;
  /**
   * Foto secundária revelada no hover — corte/interior/macro.
   * Crítico pra bolo no pote, onde exterior não mostra recheio.
   */
  photoSecondary?: ProductPhoto;
  active: boolean;
  /** Quantidade disponível em estoque. 0 = esgotado. */
  stock: number;
  /** Quantidade a partir da qual exibe alerta "Estoque baixo". */
  lowStockThreshold: number;

  // ── Social proof (origem iFood, equity real 4.8-4.9) ──────────────────
  /** Nota iFood histórica (0-5). Opcional — só exibe se existe. */
  ifoodRating?: number;
  /** Nº total de pedidos no iFood (histórico). Opcional. */
  ifoodOrderCount?: number;

  // ── Ícones semióticos ─────────────────────────────────────────────────
  /** Quantas pessoas o item serve. Exibido como "Serve X". */
  serves?: number;
  /** Ingredientes/alérgenos PRESENTES (intolerante a castanha etc.) */
  contains?: readonly ProductContains[];
  /** Se aceita freezer. */
  freezable?: boolean;
};
