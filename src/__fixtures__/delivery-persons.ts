/**
 * Fixture de entregadores (motoqueiros) — usado pelo seed.
 *
 * Não importar em código de produção — store hidrata via
 * `listActiveDeliveryPersons()` em `src/server/delivery-persons.ts`.
 */

import type { DeliveryPerson } from "@/types/delivery-person";

export const deliveryPersonFixtures: ReadonlyArray<Omit<DeliveryPerson, "id">> = [
  { name: "Lucas Andrade", phone: "(31) 99100-1001", plate: "ABC-1D23", active: true },
  { name: "Rafael Souza", phone: "(31) 99200-2002", plate: "DEF-2E34", active: true },
  { name: "Diego Martins", phone: "(31) 99300-3003", plate: "GHI-3F45", active: true },
  { name: "Thiago Oliveira", phone: "(31) 99400-4004", plate: "JKL-4G56", active: true },
  { name: "Felipe Rocha", phone: "(31) 99500-5005", plate: "MNO-5H67", active: true },
];
