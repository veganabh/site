/**
 * Helpers de endereço usáveis em qualquer ambiente (server + client).
 *
 * Não tem `"use client"`: `mappers.ts` (server) chama `inferAddressType` ao
 * hidratar `Address` a partir de `user_addresses.label`. Sem isso, Next 16
 * lança "Attempted to call X from the server but X is on the client".
 */

export type AddressType = "casa" | "trabalho" | "outro";

/**
 * Classifica tipo do endereço a partir do label.
 * `user_addresses.label` é texto livre — UI deriva chip/ícone.
 */
export function inferAddressType(label: string): AddressType {
  const normalized = label.toLowerCase().trim();
  if (
    normalized === "casa" ||
    normalized.startsWith("casa ") ||
    normalized.includes(" casa")
  ) {
    return "casa";
  }
  if (
    normalized === "trabalho" ||
    normalized.startsWith("trabalho") ||
    normalized.includes("escritório") ||
    normalized.includes("escritorio") ||
    normalized.includes("empresa")
  ) {
    return "trabalho";
  }
  return "outro";
}
