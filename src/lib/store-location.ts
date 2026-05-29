/**
 * Localização física do ponto de produção da Veg.ana.
 *
 * Usado em:
 * - /gestao/zonas — centro do mapa de anéis de entrega
 * - haversine — ponto de origem para cálculo de distância
 * - /gestao/configuracoes — seção "Dados da loja" (read-only)
 *
 * Coordenadas geocodadas via Nominatim (Passo 4, 2026-04-22).
 * Query: street=Rua+Corinto+202&city=Belo+Horizonte&state=MG&postalcode=30220-310&country=Brazil
 * Resultado: centróide de Rua Corinto em Serra — OSM não tem o nº 202 cadastrado,
 * mas a rua é curta (~400m de extensão) portanto o desvio é ≤ 200m.
 * Re-geocodar quando OSM atualizar o número.
 *
 * WhatsApp: número real da proprietária (E.164 sem "+").
 */
export const STORE_LOCATION = {
  name: "Veg.ana Confeitaria",
  street: "Rua Corinto",
  number: "202",
  neighborhood: "Serra",
  city: "Belo Horizonte",
  state: "MG",
  cep: "30220-310",
  lat: -19.9399643,
  lng: -43.9145917,
  /** Número real no formato E.164 sem "+". Fonte única — usar em todo link wa.me. */
  whatsappNumber: "5531995180455",
  instagramHandle: "@vegana.bh",
} as const;

export type StoreLocation = typeof STORE_LOCATION;
