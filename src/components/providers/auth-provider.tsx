"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/server/supabase/client";
import type { Database } from "@/types/db";

export type AuthStatus = "loading" | "anon" | "authed";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  cpf: string;
  city: string;
  role: "admin" | "customer";
};

type AuthContextValue = {
  status: AuthStatus;
  user: SessionUser | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  user: null,
  refresh: async () => {},
});

/**
 * Provider único de sessão Supabase. Carrega `profile` + cidade da default
 * address via SDK browser e escuta `onAuthStateChange`. Toda parte do app
 * que chama `useSession()` lê deste contexto — sem múltiplas subscrições.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<{ status: AuthStatus; user: SessionUser | null }>({
    status: "loading",
    user: null,
  });
  const pathname = usePathname();
  const lastSyncedAuthIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function applySession(authUserId: string | null, email: string | null) {
      lastSyncedAuthIdRef.current = authUserId;
      if (!authUserId) {
        if (mounted) setState({ status: "anon", user: null });
        return;
      }
      const user = await loadProfile(supabase, authUserId, email ?? "");
      if (mounted) setState({ status: "authed", user });
    }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      void applySession(authUser?.id ?? null, authUser?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user?.id ?? null, session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Server Actions (signIn/signOut) escrevem cookies server-side e fazem
  // redirect — `onAuthStateChange` no browser NÃO dispara nesse fluxo. Quando
  // a rota muda, re-checa `getUser()`: o cookie atualizado pelo middleware é
  // lido e o estado se sincroniza. Compara contra `lastSyncedAuthIdRef` pra
  // evitar reload do profile a cada navegação interna sem mudança de sessão.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (cancelled) return;
      const nextId = authUser?.id ?? null;
      if (nextId === lastSyncedAuthIdRef.current) return;
      lastSyncedAuthIdRef.current = nextId;
      if (!nextId) {
        setState({ status: "anon", user: null });
        return;
      }
      const user = await loadProfile(supabase, nextId, authUser?.email ?? "");
      if (!cancelled) setState({ status: "authed", user });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      refresh: async () => {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          setState({ status: "anon", user: null });
          return;
        }
        const user = await loadProfile(supabase, authUser.id, authUser.email ?? "");
        setState({ status: "authed", user });
      },
    }),
    [state, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

async function loadProfile(
  supabase: SupabaseClient<Database>,
  id: string,
  email: string,
): Promise<SessionUser> {
  const [profileRes, addressRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name,last_name,phone,cpf,role")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("user_addresses")
      .select("city")
      .eq("profile_id", id)
      .eq("is_default", true)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const address = addressRes.data;
  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";

  return {
    id,
    email,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || email,
    phone: profile?.phone ?? "",
    cpf: profile?.cpf ?? "",
    city: address?.city ?? "",
    role: profile?.role === "admin" ? "admin" : "customer",
  };
}
