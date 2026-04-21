/**
 * Super-categoria customizada — curadoria editorial que agrega produtos de
 * categorias reais (Bolos, Docinhos, Bolo no Pote) sem duplicar estoque.
 *
 * Exemplo: "Para Presentear" pode listar 1 brownie + 1 bombom + 1 brigadeiro.
 * Estoque continua sendo controlado na categoria-mãe de cada produto;
 * a super-categoria é só uma *view* curada com productIds.
 */

import type { LucideIcon } from "lucide-react";

export type CustomCollection = {
  id: string;
  /** Slug usado em ?col=<slug>. */
  slug: string;
  /** Nome exibido no chip. */
  name: string;
  /** Sub-texto opcional mostrado no header da grade quando selecionada. */
  tagline?: string;
  /** Nome do ícone lucide — resolvido no componente. */
  icon: LucideIcon;
  /** IDs dos produtos que compõem a coleção. Ordem importa — preserva curadoria. */
  productIds: readonly string[];
};
