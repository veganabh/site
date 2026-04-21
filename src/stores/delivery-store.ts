"use client";

import { create } from "zustand";

/**
 * Representa a consulta de entrega feita pelo usuário na home.
 * Mock: mapeia CEP → bairro + ETA estática.
 * Substituir por API real de cálculo de frete + janela quando backend estiver pronto.
 */
export type DeliveryQuote = {
  cep: string;
  neighborhood: string;
  city: string;
  /** ETA formatada (ex: "amanhã até 18h"). */
  eta: string;
  shippingFee: number;
  /** Se está dentro da área coberta (BH). */
  covered: boolean;
};

type DeliveryStore = {
  quote: DeliveryQuote | null;
  setCep: (cep: string) => DeliveryQuote | null;
  clear: () => void;
};

// Mock de mapeamento CEP → região/ETA. Primeiros 3 dígitos = região BH.
const BH_COVERED_PREFIXES = new Set([
  "301",
  "302",
  "303",
  "304",
  "305",
  "306",
  "307",
  "308",
  "310",
  "311",
  "312",
  "313",
  "314",
  "315",
  "316",
  "317",
  "318",
  "319",
]);

function sanitizeCep(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function formatCep(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function mockQuote(cep: string): DeliveryQuote | null {
  const digits = sanitizeCep(cep);
  if (digits.length !== 8) return null;

  const prefix = digits.slice(0, 3);
  const covered = BH_COVERED_PREFIXES.has(prefix);

  if (!covered) {
    return {
      cep: formatCep(digits),
      neighborhood: "",
      city: "",
      eta: "",
      shippingFee: 0,
      covered: false,
    };
  }

  // Mock de bairro por prefixo. Em produção: ViaCEP + cálculo real.
  const neighborhoodByPrefix: Record<string, string> = {
    "301": "Centro",
    "302": "Santa Efigênia",
    "303": "Cidade Nova",
    "304": "Floresta",
    "305": "Padre Eustáquio",
    "306": "Prado",
    "307": "Barreiro",
    "308": "Gutierrez",
    "310": "Anchieta",
    "311": "Funcionários",
    "312": "Savassi",
    "313": "Sion",
    "314": "Cidade Jardim",
    "315": "Serra",
    "316": "Belvedere",
    "317": "Mangabeiras",
    "318": "São Bento",
    "319": "Buritis",
  };

  const freeDeliveryPrefixes = new Set(["311", "312", "313"]);
  const shippingFee = freeDeliveryPrefixes.has(prefix) ? 0 : 5;

  // Tempo estimado de entrega por região (em minutos).
  // TODO: substituir por configuração no painel admin quando disponível.
  const etaByPrefix: Record<string, string> = {
    "301": "35–45 min",   // Centro
    "302": "30–40 min",   // Santa Efigênia
    "303": "35–45 min",   // Cidade Nova
    "304": "30–40 min",   // Floresta
    "305": "45–55 min",   // Padre Eustáquio
    "306": "50–60 min",   // Prado
    "307": "60–75 min",   // Barreiro
    "308": "40–50 min",   // Gutierrez
    "310": "35–45 min",   // Anchieta
    "311": "25–35 min",   // Funcionários
    "312": "20–30 min",   // Savassi — zona de produção
    "313": "25–35 min",   // Sion
    "314": "35–45 min",   // Cidade Jardim
    "315": "40–50 min",   // Serra
    "316": "55–70 min",   // Belvedere
    "317": "55–70 min",   // Mangabeiras
    "318": "30–40 min",   // São Bento
    "319": "50–65 min",   // Buritis
  };

  return {
    cep: formatCep(digits),
    neighborhood: neighborhoodByPrefix[prefix] ?? "Belo Horizonte",
    city: "Belo Horizonte",
    eta: etaByPrefix[prefix] ?? "amanhã até 18h",
    shippingFee,
    covered: true,
  };
}

export const useDeliveryStore = create<DeliveryStore>((set) => ({
  quote: null,
  setCep: (cep) => {
    const quote = mockQuote(cep);
    set({ quote });
    return quote;
  },
  clear: () => set({ quote: null }),
}));
