import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Concatena e deduplica classes Tailwind preservando a última ocorrência
 * em caso de conflito (ex: `p-4 p-8` → `p-8`). Use em todo componente.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
