import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge configurado com os tokens customizados do DS Veg.ana.
 *
 * Problema: o tailwind-merge padrão trata TODOS os prefixos `text-*` como
 * potencialmente conflitantes (font-size ou color — ele não sabe distinguir).
 * Com tokens customizados do Tailwind v4 (`--text-h3`, `--color-olive-900`),
 * `text-h3` (font-size) e `text-olive-900` (color) são removidos um pelo outro.
 *
 * Solução: registrar os tokens de tipografia como grupo `fontSize` e os tokens
 * de cor como grupo `textColor`, para que o merge os trate como propriedades
 * CSS distintas e não conflitantes entre si.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        // Tipografia do DS — mapeiam para font-size (CSS property)
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-body-lg",
        "text-body",
        "text-body-sm",
        "text-caption",
        "text-micro",
        "text-cta",
        "text-price",
        "text-price-big",
      ],
    },
  },
});

/**
 * Concatena e deduplica classes Tailwind preservando a última ocorrência
 * em caso de conflito (ex: `p-4 p-8` → `p-8`).
 *
 * Reconhece os tokens tipográficos do DS Veg.ana (`text-h3`, `text-body-sm`,
 * etc.) como font-size, distinguindo-os de classes de cor (`text-olive-900`).
 *
 * Use em todo componente.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
