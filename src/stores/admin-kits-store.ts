/**
 * Store admin de templates de kit de presente — pré-migração Supabase.
 *
 * Referência: ADR 0005 (Zustand + persist para admin-side data pré-migração).
 * Ao migrar pro Supabase: substituir persist por queries à tabela `gift_kit_templates`.
 *
 * GiftKitTemplate.icon é LucideIcon (não serializável).
 * Aqui usamos AdminKitTemplate com iconName: GiftKitIconName (string).
 * Resolução string → componente via resolveKitIcon() em src/lib/kit-icons.ts.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GiftKitIconName } from "@/lib/kit-icons";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type AdminKitSlot = {
  id: string;
  label: string;
  helper?: string;
  qty: number;
  eligibleProductIds: string[];
};

export type AdminKitTemplate = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  priceIfoodAnchor: number;
  iconName: GiftKitIconName;
  coverPhoto: { url: string; alt: string };
  slots: AdminKitSlot[];
  active: boolean;
};

type CreateResult = { success: boolean; error?: string };

type AdminKitsState = {
  kits: AdminKitTemplate[];
};

type AdminKitsActions = {
  /** Cria novo template. Valida unicidade de slug, formato kebab-case, preços e slots. */
  create: (kit: Omit<AdminKitTemplate, "id">) => CreateResult;
  /** Atualiza campos de um template existente pelo id. */
  update: (id: string, patch: Partial<Omit<AdminKitTemplate, "id">>) => void;
  /** Remove template pelo id. */
  delete: (id: string) => void;
  /** Alterna active true ↔ false. */
  toggleActive: (id: string) => void;
};

type AdminKitsStore = AdminKitsState & AdminKitsActions;

// ── Seed inicial — derivado de mock-gift-kits ──────────────────────────────────

const INITIAL_KITS: AdminKitTemplate[] = [
  {
    id: "kit-individual",
    slug: "individual",
    name: "Kit Presente Individual",
    tagline: "Pra quem você gosta — e só.",
    description:
      "Um mimo pessoal e afetivo: um bolo no pote fresquinho e dois docinhos pra acompanhar. Perfeito pra mandar pra uma amiga, recepcionar alguém que chegou de viagem ou agradecer aquele favor. Você escolhe os sabores — a gente cuida do resto.",
    price: 31.9,
    priceIfoodAnchor: 42.0,
    iconName: "Heart",
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
    iconName: "Gift",
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
    iconName: "Users",
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

// ── Validação de slug ──────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateKit(
  kit: Omit<AdminKitTemplate, "id">,
  existingSlugs: string[],
): string | null {
  if (!SLUG_RE.test(kit.slug)) {
    return "Slug inválido — use apenas letras minúsculas, números e hífens.";
  }
  if (existingSlugs.some((s) => s.toLowerCase() === kit.slug.toLowerCase())) {
    return "Já existe um kit com esse slug.";
  }
  if (kit.price <= 0) {
    return "Preço deve ser maior que zero.";
  }
  if (kit.priceIfoodAnchor <= kit.price) {
    return "Preço âncora iFood deve ser maior que o preço do kit.";
  }
  if (kit.slots.length === 0) {
    return "O kit precisa ter pelo menos 1 slot.";
  }
  for (const slot of kit.slots) {
    if (slot.eligibleProductIds.length === 0) {
      return `O slot "${slot.label}" precisa ter pelo menos 1 produto elegível.`;
    }
  }
  return null;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAdminKitsStore = create<AdminKitsStore>()(
  persist(
    (set, get) => ({
      kits: [...INITIAL_KITS],

      create: (input) => {
        const existingSlugs = get().kits.map((k) => k.slug);
        const error = validateKit(input, existingSlugs);
        if (error) return { success: false, error };

        const newKit: AdminKitTemplate = {
          ...input,
          id: crypto.randomUUID(),
        };

        set((s) => ({ kits: [...s.kits, newKit] }));
        return { success: true };
      },

      update: (id, patch) => {
        set((s) => ({
          kits: s.kits.map((k) => (k.id === id ? { ...k, ...patch } : k)),
        }));
      },

      delete: (id) => {
        set((s) => ({ kits: s.kits.filter((k) => k.id !== id) }));
      },

      toggleActive: (id) => {
        set((s) => ({
          kits: s.kits.map((k) => (k.id === id ? { ...k, active: !k.active } : k)),
        }));
      },
    }),
    {
      name: "vegana.admin-kits",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.kits.length === 0) {
          state.kits = [...INITIAL_KITS];
        }
      },
    },
  ),
);
