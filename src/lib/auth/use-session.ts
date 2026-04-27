"use client";

import { useAuth } from "@/components/providers/auth-provider";

export type AuthStatus = "loading" | "anon" | "authed";

export type SessionUser = {
  id: string;
  name: string;
  firstName: string;
  email: string;
  city: string;
  role: "admin" | "customer";
};

type SessionResult = {
  status: AuthStatus;
  isAuthed: boolean;
  user: SessionUser | null;
};

/**
 * Camada única de sessão. Lê do `AuthProvider` que escuta Supabase
 * `onAuthStateChange` e carrega o profile.
 *
 * `status` pode ser `"loading"` enquanto a primeira chamada `getUser()`
 * resolve. Componentes que renderizam algo crítico durante o carregamento
 * devem checar `status === "loading"` explicitamente.
 */
export function useSession(): SessionResult {
  const { status, user } = useAuth();

  if (status !== "authed" || !user) {
    return { status, isAuthed: false, user: null };
  }

  return {
    status,
    isAuthed: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      name: user.name,
      email: user.email,
      city: user.city,
      role: user.role,
    },
  };
}
