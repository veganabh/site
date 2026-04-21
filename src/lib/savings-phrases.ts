export type SavingsTier = {
  /** Limite superior inclusivo da faixa (em reais). Use Infinity para a última. */
  maxInclusive: number;
  /** Até 3 frases por faixa — rotacionam no hero de /conta. */
  phrases: string[];
};

/**
 * Faixas ordenadas por valor ascendente. A busca pega a primeira faixa cujo
 * `maxInclusive` cobre o valor informado. Frases devem terminar numa
 * continuação natural de "Com essa grana que economizou…".
 */
export const SAVINGS_TIERS: SavingsTier[] = [
  {
    maxInclusive: 20,
    phrases: [
      "daria pra um café especial numa manhã calma",
      "seria uma revista nova pra ler domingo à tarde",
      "dá pra um chá bom pra acompanhar o próximo doce",
    ],
  },
  {
    maxInclusive: 50,
    phrases: [
      "daria pra um livro novo pra começar essa semana",
      "seria uma sessão de cinema com pipoca e refri",
      "daria pra levar uma planta nova pra casa",
    ],
  },
  {
    maxInclusive: 100,
    phrases: [
      "daria pra uma blusa nova pra estrear no fim de semana",
      "seria um jantar a dois num lugar gostoso",
      "daria pra uma coleira bonita pro seu pet",
    ],
  },
  {
    maxInclusive: 200,
    phrases: [
      "daria pra um tênis novo pra caminhar pela Savassi",
      "seria um passeio de um dia em Tiradentes ou Brumadinho",
      "daria pra começar uma poupança pra uma viagem curta",
    ],
  },
  {
    maxInclusive: 500,
    phrases: [
      "daria pra aquele curso que você vive adiando",
      "seria um fim de semana numa pousada na Serra",
      "daria pra reformar um cantinho da casa que você sonha",
    ],
  },
  {
    maxInclusive: Infinity,
    phrases: [
      "daria pra começar a planejar uma viagem mais longa",
      "seria uma troca de móvel que tava na lista faz tempo",
      "daria pra investir num sonho antigo que tá esperando",
    ],
  },
];

export function getPhrasesForSavings(value: number): string[] {
  const tier = SAVINGS_TIERS.find((t) => value <= t.maxInclusive);
  return tier ? tier.phrases : SAVINGS_TIERS[SAVINGS_TIERS.length - 1].phrases;
}
