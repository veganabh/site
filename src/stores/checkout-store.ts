"use client";

import { create } from "zustand";

export type CheckoutStep = "resumo" | "endereco" | "pagamento" | "confirmado";

type CheckoutStore = {
  step: CheckoutStep;
  orderId: string | null;
  setStep: (step: CheckoutStep) => void;
  setOrderId: (id: string) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  step: "resumo",
  orderId: null,

  setStep: (step) => set({ step }),

  setOrderId: (orderId) => set({ orderId }),

  reset: () => set({ step: "resumo", orderId: null }),
}));
