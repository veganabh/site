"use client";

import { create } from "zustand";

export type CheckoutStep = "resumo" | "endereco" | "pagamento" | "confirmado";

export type GuestIdentity = {
  firstName: string;
  email: string;
  phone: string;
};

type CheckoutStore = {
  step: CheckoutStep;
  orderId: string | null;
  /**
   * Identidade preenchida por usuário anônimo no step de endereço.
   * null = não preenchido. Ignorado quando a sessão é autenticada.
   */
  guest: GuestIdentity | null;
  setStep: (step: CheckoutStep) => void;
  setOrderId: (id: string) => void;
  setGuest: (guest: GuestIdentity | null) => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  step: "resumo",
  orderId: null,
  guest: null,

  setStep: (step) => set({ step }),
  setOrderId: (orderId) => set({ orderId }),
  setGuest: (guest) => set({ guest }),

  reset: () => set({ step: "resumo", orderId: null, guest: null }),
}));
