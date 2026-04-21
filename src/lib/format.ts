/**
 * Formata valor numérico como moeda BRL (R$ 8,00).
 * Sempre usa locale pt-BR e duas casas decimais.
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata CEP bruto para o padrão "NNNNN-NNN".
 * Aceita até 8 dígitos; remove caracteres não-numéricos.
 */
export function formatCEP(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/**
 * Calcula a economia total entre o preço praticado pela loja e o preço do
 * iFood por SKU presente no carrinho. Se o iFood está em promoção e o preço
 * se iguala ao da loja, esse item não soma economia.
 */
export function computeSavings(
  items: Array<{ priceSite: number; priceIfood: number; quantity: number }>,
): number {
  return items.reduce((acc, item) => {
    const delta = item.priceIfood - item.priceSite;
    return acc + (delta > 0 ? delta * item.quantity : 0);
  }, 0);
}
