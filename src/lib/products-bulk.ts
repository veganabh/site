/**
 * Constantes e tipos de edição em massa de produtos.
 *
 * Vive fora de `server/actions/products.ts` porque arquivos `"use server"`
 * só podem exportar funções async — exportar const/objeto quebra o build
 * ("A 'use server' file can only export async functions, found object").
 */

export const PRICE_BULK_MODES = ["set", "inc_pct", "dec_pct", "inc_abs", "dec_abs"] as const;
export type PriceBulkMode = (typeof PRICE_BULK_MODES)[number];

export type BulkActionResult =
  | { ok: true; affected: number }
  | { ok: false; message: string };
