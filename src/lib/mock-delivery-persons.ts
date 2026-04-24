/**
 * Pool de motoqueiros fake — pré-integração WhatsApp Cloud API.
 *
 * Quando a integração real chegar, `callDelivery` na store admin
 * substitui o sorteio por uma Server Action que dispara o webhook.
 * O contrato da store (retorna id string) não muda.
 */

export type DeliveryPerson = {
  id: string;
  name: string;
  /** Formato: (31) 9XXXX-XXXX */
  phone: string;
  /** Placa no padrão Mercosul ou antigo */
  plate: string;
  avatarUrl?: string;
};

export const MOCK_DELIVERY_PERSONS: readonly DeliveryPerson[] = [
  {
    id: "moto-01",
    name: "Lucas Andrade",
    phone: "(31) 99100-1001",
    plate: "ABC-1D23",
  },
  {
    id: "moto-02",
    name: "Rafael Souza",
    phone: "(31) 99200-2002",
    plate: "DEF-2E34",
  },
  {
    id: "moto-03",
    name: "Diego Martins",
    phone: "(31) 99300-3003",
    plate: "GHI-3F45",
  },
  {
    id: "moto-04",
    name: "Thiago Oliveira",
    phone: "(31) 99400-4004",
    plate: "JKL-4G56",
  },
  {
    id: "moto-05",
    name: "Felipe Rocha",
    phone: "(31) 99500-5005",
    plate: "MNO-5H67",
  },
] as const;

/** Sorteia um motoqueiro aleatório do pool. */
export function getRandomDeliveryPerson(): DeliveryPerson {
  const idx = Math.floor(Math.random() * MOCK_DELIVERY_PERSONS.length);
  return MOCK_DELIVERY_PERSONS[idx];
}
