import { vi } from "vitest";

/**
 * Mock encadeável do client Supabase para testes de server action.
 *
 * Replica a query-builder fluente (`.from().select().eq().maybeSingle()`,
 * `.insert().select().single()`, `.select(_, {count}).eq()` awaited, `.rpc()`)
 * sem rede nem banco. Cada chamada terminal chama o `resolver` que você passa,
 * com o contexto (tabela, mutação, tipo de terminal, se é count) — você decide
 * o que devolver por tabela.
 *
 * Uso típico: um client para o server (leitura/auth) e outro para o service
 * (insert/update via service-role).
 */

export type QueryResult = { data?: unknown; error?: unknown; count?: number };

export type ResolverCtx = {
  table: string;
  mutation: "insert" | "update" | "delete" | null;
  term: "single" | "maybeSingle" | "await";
  count: boolean;
};

export type Resolver = (ctx: ResolverCtx) => QueryResult;

const CHAIN_METHODS = [
  "eq",
  "neq",
  "in",
  "gte",
  "lte",
  "gt",
  "lt",
  "is",
  "not",
  "or",
  "order",
  "limit",
  "range",
  "contains",
  "match",
] as const;

export type MockUser = { id: string; email?: string } | null;

export function createClientMock(resolver: Resolver, opts: { user?: MockUser } = {}) {
  const auth = {
    getUser: vi.fn(async () => ({ data: { user: opts.user ?? null }, error: null })),
  };

  const rpc = vi.fn(async (name: string) =>
    resolver({ table: `rpc:${name}`, mutation: null, term: "await", count: false }),
  );

  const from = vi.fn((table: string) => {
    const state = { mutation: null as ResolverCtx["mutation"], count: false };
    const builder: Record<string, unknown> = {};
    const same = () => builder;

    builder.select = vi.fn((_cols?: unknown, o?: { count?: string; head?: boolean }) => {
      if (o?.count) state.count = true;
      return builder;
    });
    builder.insert = vi.fn(() => {
      state.mutation = "insert";
      return builder;
    });
    builder.update = vi.fn(() => {
      state.mutation = "update";
      return builder;
    });
    builder.delete = vi.fn(() => {
      state.mutation = "delete";
      return builder;
    });
    for (const m of CHAIN_METHODS) builder[m] = vi.fn(same);

    builder.maybeSingle = vi.fn(async () =>
      resolver({ table, mutation: state.mutation, term: "maybeSingle", count: state.count }),
    );
    builder.single = vi.fn(async () =>
      resolver({ table, mutation: state.mutation, term: "single", count: state.count }),
    );
    // Torna o builder "awaitable" — para queries sem single/maybeSingle.
    builder.then = (
      onFulfilled: (v: QueryResult) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) =>
      Promise.resolve(
        resolver({ table, mutation: state.mutation, term: "await", count: state.count }),
      ).then(onFulfilled, onRejected);

    return builder;
  });

  return { auth, rpc, from } as unknown as {
    auth: typeof auth;
    rpc: typeof rpc;
    from: typeof from;
  };
}

/** YYYY-MM-DD de hoje + offset de dias, em horário local (evita flake de fuso). */
export function localDatePlusDays(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
