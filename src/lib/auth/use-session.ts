"use client";

import { useDevSessionStore } from "@/stores/dev-session-store";

export type AuthStatus = "anon" | "authed";

export type SessionUser = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  city: string;
};

type SessionResult = {
  status: AuthStatus;
  isAuthed: boolean;
  user: SessionUser | null;
};

/**
 * Camada única de sessão. Consumers NÃO tocam no store dev diretamente —
 * lêem deste hook. Quando o login real chegar, trocamos só o corpo:
 *
 *   const { data } = useSupabaseSession();
 *   return { status: data ? "authed" : "anon", ... };
 *
 * Nenhuma página/componente precisa mudar.
 */
export function useSession(): SessionResult {
  const isAuthed = useDevSessionStore((s) => s.isAuthed);
  const mockUser = useDevSessionStore((s) => s.user);

  if (!isAuthed) {
    return { status: "anon", isAuthed: false, user: null };
  }

  const user: SessionUser = {
    id: mockUser.id,
    firstName: mockUser.firstName,
    name: `${mockUser.firstName} ${mockUser.lastName}`.trim(),
    email: mockUser.email,
    city: mockUser.city,
  };

  return { status: "authed", isAuthed: true, user };
}
