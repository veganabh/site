/**
 * Super-categoria customizada — curadoria editorial que agrega produtos de
 * categorias reais (Bolos, Docinhos, Bolo no Pote) sem duplicar estoque.
 *
 * Exemplo: "Para Presentear" pode listar 1 brownie + 1 bombom + 1 brigadeiro.
 * Estoque continua sendo controlado na categoria-mãe de cada produto;
 * a super-categoria é só uma *view* curada com productIds.
 *
 * Persistido em public.collections (Supabase). icon resolve via
 * lib/collection-icons.ts a partir de iconName (string DB).
 */

import type { CollectionIconName } from "@/lib/collection-icons";

export type Collection = {
  id: string;
  /** Slug usado em ?col=<slug>. Único entre coleções vivas (deleted_at IS NULL). */
  slug: string;
  /** Nome exibido no chip. */
  name: string;
  /** Sub-texto opcional mostrado no header da grade quando selecionada. */
  tagline: string;
  /** Chave Lucide whitelist — resolvida via resolveCollectionIcon. */
  iconName: CollectionIconName;
  /**
   * Rota dedicada quando o chip aponta pra página própria (ex: "/presentear").
   * `null` = chip filtra a vitrine principal via `?col=<slug>`.
   */
  routePath: string | null;
  /** UUIDs de products.id na ordem de exibição. Ordem importa — preserva curadoria. */
  productIds: readonly string[];
  /** Ordem na chip bar — menor primeiro. */
  sortOrder: number;
  /** Visibilidade pública. Inativa some pra não-admin (RLS). */
  active: boolean;
};
