# Site/app — CLAUDE.md técnico

> **Contexto:** subprojeto de código do site próprio da Veg.ana. Este arquivo é lido sempre que se trabalha dentro de `Site/app/`.
> **Raiz do projeto maior:** `../../` — lá vivem `CLAUDE.md` estratégico, `PROJECT_STATUS.md`, `Marca/Design System v1.md`, `Marca/Brand Voice Guide.md`, `Site/Arquitetura de Informacao v1.md`. Consulte quando tomar decisão de produto, voz, marca ou arquitetura.

---

## 1. Avisos do framework

@AGENTS.md

O Next.js 16 (não 15, apesar do planejamento ter mencionado 15) tem breaking changes em APIs, conventions e file structure em relação a 14/15. **Ler o guia relevante em `node_modules/next/dist/docs/` antes de escrever código novo.**

Observações concretas da v16:

- `params` em rotas dinâmicas é `Promise<{...}>` — sempre usar `await`.
- Tailwind v4 usa `@import "tailwindcss"` em CSS e configuração via CSS variables em vez de `tailwind.config.ts` (em parte — parte permanece).

---

## 2. Stack consolidada

| Camada                    | Tool                                                        |
| ------------------------- | ----------------------------------------------------------- |
| Framework                 | Next.js 16 (App Router, Server Components default)          |
| Linguagem                 | TypeScript estrito                                          |
| Estilização               | Tailwind CSS 4 + CSS variables (tokens DS)                  |
| UI primitives             | Radix UI                                                    |
| Forms                     | React Hook Form + Zod                                       |
| Estado client             | Zustand (carrinho)                                          |
| Estado server-in-client   | TanStack Query                                              |
| Database / Auth / Storage | Supabase                                                    |
| Pagamento                 | Pagar.me (sandbox → prod)                                   |
| WhatsApp                  | Cloud API                                                   |
| Analytics                 | PostHog                                                     |
| Testes                    | Vitest + Testing Library (unit/component), Playwright (e2e) |
| Deploy                    | Vercel (depois do OK final)                                 |

Mudança de stack exige **ADR aprovado pelo Lead** — doc em `docs/adr/`.

---

## 3. Estrutura de pastas

```
Site/app/
├── src/
│   ├── app/                  rotas Next.js (App Router)
│   │   ├── layout.tsx        layout raiz
│   │   ├── page.tsx          home
│   │   ├── globals.css       imports + CSS vars do DS
│   │   ├── (routes)/         grupos sem afetar URL
│   │   └── api/              route handlers
│   ├── components/
│   │   ├── ui/               primitives do DS (button, card, badge)
│   │   └── features/         compostos de feature (savings-widget, cart-drawer)
│   ├── lib/                  helpers gerais (utils, formatters)
│   ├── server/               código server-only
│   │   └── supabase/         client server, queries
│   ├── stores/               Zustand stores (cart)
│   ├── styles/               ds-tokens.css, outras extensões
│   └── types/                tipos compartilhados + types do DB (gerado)
├── supabase/
│   └── migrations/           migrations versionadas
├── docs/
│   └── adr/                  Architectural Decision Records
├── public/                   assets estáticos
├── scripts/                  scripts auxiliares (seed, gen types)
├── .env.local.example        modelo de variáveis sensíveis (commit)
├── .env.local                chaves reais (NÃO commitar)
├── .gitignore                inclui .env.local, node_modules, .next
├── CLAUDE.md                 este arquivo
├── AGENTS.md                 avisos Next.js 16
├── package.json
├── tsconfig.json
├── next.config.ts
└── eslint.config.mjs
```

---

## 4. Convenções de código

### Nomes

- Arquivos: **kebab-case** (`product-card.tsx`, `format-currency.ts`)
- Componentes React: **PascalCase** (`ProductCard`)
- Hooks: **camelCase com prefixo use** (`useCart`, `useCountdown`)
- Funções/vars: **camelCase** (`formatCurrency`, `cartItems`)
- Constantes: **SCREAMING_SNAKE** (`MAX_CART_ITEMS`, `DEFAULT_CEP`)
- Types/Interfaces: **PascalCase** (`Product`, `CartItem`)
- Pasta de feature complexa: kebab-case com `index.tsx` como entry

### Exports

- **Named export** por padrão (melhor para refactor e autocomplete).
- Default export **só** em páginas Next.js (convenção do framework) e error/loading/not-found boundaries.

### Import alias

- `@/*` → `src/*`. Nunca `../../../`.

### Server vs Client

- **Server Component por padrão.**
- `"use client"` apenas com: `useState`, `useEffect`, event handlers, contexto, browser APIs, libs client-only (Zustand, TanStack Query, Radix em alguns casos).
- Se o componente é client-only, deixar essa restrição explícita no nome da pasta ou comentário no topo.

### Strings visíveis ao usuário

- **Toda** string visível passa pelo **Brand Voice Guide** (`Marca/Brand Voice Guide.md`).
- Em caso de dúvida: acionar `brand-voice-keeper` via `product-engineering-orchestrator`.
- Mensagens de sistema seguem AI v1 §21.

### Tokens do DS

- Nunca hex solto. Sempre CSS var (`var(--c-olive-900)`) ou classe Tailwind mapeada (`bg-olive-900`).
- Nunca `font-family` fora das 3 famílias (`font-script`, `font-serif`, `font-sans`).
- Nunca px solto para spacing — só scale Tailwind (`p-4`, `gap-3`).

---

## 5. Comandos úteis

```bash
npm run dev           # servidor local em http://localhost:3100
npm run build         # build de produção
npm run start         # rodar build localmente
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run test          # Vitest
npm run format        # prettier --write .
```

**Porta dedicada: 3100.** Veg.ana roda em `localhost:3100` (não 3000). Isso evita conflito com outros projetos Next/Rails/Node que também usam 3000 como default. Configurado no script `dev` do `package.json`.

Scripts adicionais ainda a adicionar ao package.json:

```json
"typecheck": "tsc --noEmit",
"format": "prettier --write .",
"format:check": "prettier --check .",
"test": "vitest",
"test:watch": "vitest --watch",
"e2e": "playwright test"
```

---

## 6. Variáveis de ambiente

`.env.local` (nunca commitar) contém:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # só server — nunca expor

# Pagar.me (sandbox até OK final)
PAGARME_API_KEY=ak_test_...
PAGARME_WEBHOOK_SECRET=...

# WhatsApp Cloud API
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

`.env.local.example` é versionado (modelo sem valores). Nunca comite `.env.local`.

---

## 7. Git e commits

### Conventional Commits

```
feat: adiciona widget de economia
fix: corrige cálculo de frete em CEP fora da área
refactor: extrai formatador de preço para lib/
docs: atualiza ADR 0003
test: cobre motor de cross-sell v1
chore: bump next para 16.2.5
```

### Escopos opcionais

`feat(cart): adiciona persistência em localStorage`

### Branches

- `main` — sempre estável
- `feat/<descricao>` — feature em progresso
- `fix/<descricao>` — bugfix

Nada é push direto em `main` depois do git existir.

---

## 8. Segurança — regras não-negociáveis

1. **Secrets nunca no código** — sempre `.env.local`.
2. **PII nunca em log** — CPF, telefone completo, endereço, senha.
3. **RLS em toda tabela Supabase** — sem exceção.
4. **Validação de input com Zod** em toda rota/action.
5. **Webhooks validam assinatura** antes de processar.
6. **CORS restrito** para endpoints internos.
7. **Service role key** só em server actions isoladas de admin — nunca em código acessível ao cliente.

---

## 9. Qualidade — gates obrigatórios

Antes de considerar qualquer tarefa pronta:

- [ ] `npm run typecheck` passa sem erro
- [ ] `npm run lint` passa sem erro
- [ ] `npm run test` passa (se houver teste)
- [ ] `npm run format:check` passa (ou hook já formatou)
- [ ] Se mudou UI: `ds-compliance-reviewer` aprovou
- [ ] Se mudou string visível: passou pelo Brand Voice Guide
- [ ] Se mudou schema: migration aplicada com `supabase db reset` sem erro + types regenerados

---

## 10. Quando criar ADR

ADR obrigatório para:

- Trocar ou adicionar biblioteca do stack.
- Mudar estrutura de pastas significativamente.
- Adicionar integração externa (nova API, novo provedor).
- Mudar convenção de código/commit.
- Decidir padrão de uma feature complexa (ex: como o widget se comporta em múltiplos edge cases).

Formato em `docs/adr/NNNN-titulo.md` (ver `site-architect` agent).

---

## 11. Gate do DS (ds-compliance-reviewer)

Todo PR/mudança de UI passa pelo `ds-compliance-reviewer` antes de merge. É Haiku (barato) — não pule.

---

## 12. Dependências que ainda precisam ser instaladas

O scaffold não rodou `npm install`. Antes de começar a codar:

```bash
cd Site/app
npm install
npm install radix-ui zustand @tanstack/react-query react-hook-form zod
npm install -D prettier vitest @testing-library/react @testing-library/jest-dom @playwright/test @types/react-dom jsdom
npm install @supabase/supabase-js @supabase/ssr
```

Lista completa e ordem: aguardar **ADR 0001** do `site-architect` que vai consolidar dependências + justificativa (incluindo nome correto do pacote Pagar.me e do SDK PostHog).

---

## 13. Primeiro comando do dia

```bash
cd Site/app
npm install       # se node_modules não existe
npm run dev       # http://localhost:3000
```

Se `npm install` falhar por `.env.local` ausente: copiar de `.env.local.example` e preencher com chaves sandbox.

---

## 14. Checklist de novo contribuinte (ou novo agente)

- [ ] Leu este `CLAUDE.md`
- [ ] Leu `Site/Arquitetura de Informacao v1.md`
- [ ] Leu `Marca/Design System v1.md`
- [ ] Leu `Marca/Brand Voice Guide.md`
- [ ] Sabe quando usar Server vs Client Component
- [ ] Sabe invocar as skills `new-component`, `new-route`, `db-schema`
- [ ] Sabe que hooks em `.claude/settings.json` podem formatar ou bloquear commits
