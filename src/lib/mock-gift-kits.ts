import { Gift, Heart, Users } from "lucide-react";
import type { GiftKitTemplate } from "@/types/gift-kit";

/**
 * Kits de presente — templates criados no admin.
 * Cada slot tem `eligibleProductIds` curado manualmente (pool de produtos
 * com CPV similar, garantindo preço fixo do kit).
 *
 * Preço fixo funciona porque produtos dentro do mesmo slot são comparáveis:
 *   - bolos no pote: 230g · R$17,9-19,9 site
 *   - bolos:         170g · R$11,9-18,9 site
 *   - docinhos:      unid · R$6,5-7 site
 *
 * Pra adicionar kit:
 *   1. Criar entry aqui com icon do lucide-react
 *   2. Listar slots com eligibleProductIds validados
 *   3. Definir price + priceIfoodAnchor (soma média no iFood, âncora da economia)
 */
export const mockGiftKits: readonly GiftKitTemplate[] = [
  {
    id: "kit-individual",
    slug: "individual",
    name: "Kit Presente Individual",
    tagline: "Pra quem você gosta — e só.",
    description:
      "Um mimo pessoal e afetivo: um bolo no pote fresquinho e dois docinhos pra acompanhar. Perfeito pra mandar pra uma amiga, recepcionar alguém que chegou de viagem ou agradecer aquele favor. Você escolhe os sabores — a gente cuida do resto.",
    price: 31.9,
    priceIfoodAnchor: 42.0,
    icon: Heart,
    coverPhoto: {
      url: "/produtos/brownie-pote.png",
      alt: "Kit Presente Individual — 1 bolo no pote + 2 docinhos",
    },
    slots: [
      {
        id: "bolo-pote",
        label: "Escolha o bolo no pote",
        helper: "230g · pronto pra comer sem talher",
        qty: 1,
        eligibleProductIds: ["1", "2", "6", "7", "12"],
      },
      {
        id: "docinhos",
        label: "Escolha 2 docinhos",
        helper: "pode repetir o mesmo sabor",
        qty: 2,
        eligibleProductIds: ["5", "10", "11"],
      },
    ],
    active: true,
  },
  {
    id: "kit-familia",
    slug: "familia",
    name: "Kit Presente Família",
    tagline: "Um bolo inteiro pra dividir + docinhos pra não sobrar ninguém.",
    description:
      "Feito pra chegar na casa de quem você ama e dar conta da mesa toda. Um bolo inteiro e três docinhos — sabor escolhido por você. Perfeito pra aniversário de longe, chá de bebê ou um domingo em família que você não pôde estar.",
    price: 34.9,
    priceIfoodAnchor: 45.0,
    icon: Gift,
    coverPhoto: {
      url: "/produtos/bolo-cenoura-brigadeiro.png",
      alt: "Kit Presente Família — 1 bolo inteiro + 3 docinhos",
    },
    slots: [
      {
        id: "bolo",
        label: "Escolha o bolo",
        helper: "170g · fatia generosa pra dividir",
        qty: 1,
        eligibleProductIds: ["3", "4", "8", "9"],
      },
      {
        id: "docinhos",
        label: "Escolha 3 docinhos",
        helper: "pode variar os sabores",
        qty: 3,
        eligibleProductIds: ["5", "10", "11"],
      },
    ],
    active: true,
  },
  {
    id: "kit-anfitria",
    slug: "anfitria",
    name: "Kit Anfitriã",
    tagline: "Recebe bem sem dar trampo. A gente resolve a mesa.",
    description:
      "Pra você que abre a casa pra todo mundo e gosta que ninguém fique de fora — nem a amiga vegana, nem a cunhada intolerante à lactose, nem a criança enjoada. Dois bolos no pote individuais, um bolo inteiro e quatro docinhos, tudo com a curadoria da Veg.ana. Recepção pronta em uma caixa só.",
    price: 74.9,
    priceIfoodAnchor: 99.0,
    icon: Users,
    coverPhoto: {
      url: "/produtos/brownie-brigadeiro.png",
      alt: "Kit Anfitriã — 2 bolos no pote + 1 bolo + 4 docinhos",
    },
    slots: [
      {
        id: "bolos-pote",
        label: "Escolha 2 bolos no pote",
        helper: "pode variar os sabores",
        qty: 2,
        eligibleProductIds: ["1", "2", "6", "7", "12"],
      },
      {
        id: "bolo",
        label: "Escolha o bolo pra dividir",
        helper: "170g · serve a mesa",
        qty: 1,
        eligibleProductIds: ["3", "4", "8", "9"],
      },
      {
        id: "docinhos",
        label: "Escolha 4 docinhos",
        helper: "pode repetir sabor",
        qty: 4,
        eligibleProductIds: ["5", "10", "11"],
      },
    ],
    active: true,
  },
];

export function findKitBySlug(slug: string): GiftKitTemplate | undefined {
  return mockGiftKits.find((k) => k.slug === slug && k.active);
}

export function findKitById(id: string): GiftKitTemplate | undefined {
  return mockGiftKits.find((k) => k.id === id);
}
