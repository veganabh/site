/**
 * Casamento aproximado nome-do-item-iFood → produto do catálogo (ADR 0012 D4).
 * É só uma SUGESTÃO no preview — a admin confirma antes de gravar. O acerto vira
 * registro persistido (`ifood_product_map`) e o próximo import casa sozinho.
 *
 * Funções puras e testáveis.
 */

const STRIP_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const STOP = new Set([
  "de",
  "do",
  "da",
  "das",
  "dos",
  "com",
  "sem",
  "e",
  "no",
  "na",
  "ao",
  "vegano",
  "vegana",
  "cobertura",
]);

/** Tokeniza um nome: sem acento, minúsculo, sem pontuação, sem stopword. */
export function nameTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(STRIP_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type MatchCandidate = { id: string; name: string };
export type MatchResult = { id: string; score: number } | null;

/**
 * Melhor produto pro nome iFood. Igualdade normalizada → 1. Senão Jaccard de
 * tokens; retorna o melhor acima de `threshold` (default 0.5). null se nada bom.
 */
export function bestProductMatch(
  ifoodName: string,
  candidates: MatchCandidate[],
  threshold = 0.5,
): MatchResult {
  const target = new Set(nameTokens(ifoodName));
  if (target.size === 0) return null;

  let best: MatchResult = null;
  for (const c of candidates) {
    const cand = new Set(nameTokens(c.name));
    let score = jaccard(target, cand);
    // Inclusão total de um no outro dá um empurrão (nomes curtos vs longos).
    if (score < 1 && cand.size > 0) {
      const subset = [...target].every((t) => cand.has(t)) || [...cand].every((t) => target.has(t));
      if (subset) score = Math.max(score, 0.75);
    }
    if (score > (best?.score ?? 0)) best = { id: c.id, score };
  }
  return best && best.score >= threshold ? best : null;
}
