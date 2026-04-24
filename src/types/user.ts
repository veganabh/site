/**
 * Tipos de usuário consolidados.
 *
 * `SessionUser` e `AuthStatus` vivem em `lib/auth/use-session.ts` (contrato
 * estável que não muda quando o backend migrar pro Supabase). Re-exportamos
 * daqui para que consumers possam importar de um único ponto canônico.
 *
 * `UserProfile` e `UserAddress` são o shape completo do perfil —
 * usados nas páginas `/conta/perfil` e futuramente na tabela `users` do Supabase.
 */

export type { SessionUser, AuthStatus } from "@/lib/auth/use-session";

// ── Endereço salvo no perfil ──────────────────────────────────────────────────

export type UserAddress = {
  id: string;
  /** Nome amigável dado pelo cliente. Ex: "Casa", "Trabalho", "Mãe". */
  label: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  /** Latitude cacheada após geocodagem — evita recalcular em cada pedido. */
  lat?: number;
  /** Longitude cacheada após geocodagem. */
  lng?: number;
  isDefault: boolean;
};

// ── Perfil completo (pós-login real) ─────────────────────────────────────────

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Formato: "(31) 99999-9999" ou "+5531999999999" */
  phone: string;
  /** URL da foto de perfil. Undefined = avatar gerado por iniciais. */
  avatarUrl?: string;
  addresses: UserAddress[];
  /** ISO datetime — quando criou a conta. */
  createdAt: string;
};
