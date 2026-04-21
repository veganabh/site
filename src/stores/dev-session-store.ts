"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MockSessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
};

const INITIAL_USER: MockSessionUser = {
  id: "mock-ana",
  firstName: "Ana",
  lastName: "Ribeiro",
  email: "ana@exemplo.com",
  phone: "(31) 99999-9999",
  city: "Belo Horizonte",
};

type DevSessionStore = {
  isAuthed: boolean;
  user: MockSessionUser;
  setAuthed: (v: boolean) => void;
  toggle: () => void;
  updateUser: (patch: Partial<MockSessionUser>) => void;
  resetUser: () => void;
};

/**
 * Store dev-only que simula sessão autenticada e expõe um usuário mock
 * editável. Permite testar o fluxo de edição de perfil antes do login real.
 *
 * Quando a feature de login/cadastro chegar, esta store some e
 * `src/lib/auth/use-session.ts` passa a ler do Supabase.
 */
export const useDevSessionStore = create<DevSessionStore>()(
  persist(
    (set) => ({
      isAuthed: true,
      user: INITIAL_USER,
      setAuthed: (v) => set({ isAuthed: v }),
      toggle: () => set((s) => ({ isAuthed: !s.isAuthed })),
      updateUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch } })),
      resetUser: () => set({ user: INITIAL_USER }),
    }),
    { name: "vegana.dev-session" },
  ),
);
