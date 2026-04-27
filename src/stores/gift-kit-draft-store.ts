import { create } from "zustand";
import type { GiftKitPick } from "@/types/gift-kit";

/**
 * Rascunho do kit em construção — espelha o state local do KitBuilder
 * para que a sidebar lateral (KitPicksPanel) possa exibir os picks
 * vivos enquanto o cliente monta.
 *
 * Não persiste em localStorage: ao recarregar a página o stepper recomeça,
 * então a sidebar também recomeça vazia. Sem versão / sem migração.
 */
type GiftKitDraftStore = {
  /** Slug do template em montagem. null quando builder não está ativo. */
  slug: string | null;
  templateId: string | null;
  /** Picks por slotId — mesmo shape do GiftKitPick. */
  picks: GiftKitPick[];
  packaging: boolean;
  cardMessage: string;

  setDraft: (input: {
    slug: string;
    templateId: string;
    picks: GiftKitPick[];
    packaging: boolean;
    cardMessage: string;
  }) => void;
  reset: () => void;
};

const EMPTY: Omit<GiftKitDraftStore, "setDraft" | "reset"> = {
  slug: null,
  templateId: null,
  picks: [],
  packaging: false,
  cardMessage: "",
};

export const useGiftKitDraftStore = create<GiftKitDraftStore>()((set) => ({
  ...EMPTY,
  setDraft: (input) =>
    set({
      slug: input.slug,
      templateId: input.templateId,
      picks: input.picks,
      packaging: input.packaging,
      cardMessage: input.cardMessage,
    }),
  reset: () => set(EMPTY),
}));
