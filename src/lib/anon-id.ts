"use client";

/**
 * ID de visitante anônimo — "crachá" de dispositivo pra atribuir leitura/clique
 * de quem não tem login. UUID gerado na 1ª visita, guardado em localStorage →
 * persiste no F5 e entre sessões. NÃO é dado pessoal (sem nome/email), só um
 * token de dispositivo pra deduplicar métricas.
 */

const KEY = "vegana:anon-id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage indisponível (private mode) — sem id estável
    return "";
  }
}
