# ADR 0001 — Dependências e estrutura inicial

**Data:** 2026-04-19
**Autor:** `site-architect` (Opus)
**Status:** **aceita** (aprovada pelo Lead em 2026-04-19)

---

## 1. Contexto

O subprojeto `Site/app/` foi scaffolded com `create-next-app` e veio com o mínimo: Next.js 16.2.4, React 19.2.4, Tailwind CSS 4, TypeScript 5, ESLint 9 (via `eslint.config.mjs`). `npm install` ainda **não rodou**.

Antes do primeiro install, este ADR consolida:

1. Quais **dependências extras** entram no stack, com versões e justificativa de cada uma.
2. Qual **estrutura inicial de arquivos** mínima para o primeiro `npm run dev` coerente.
3. Como os **tokens do Design System v1.1** se materializam em CSS e Tailwind 4.
4. Em que **ordem** o install deve acontecer.

O princípio-guia é o mesmo do projeto: on-demand. Nada entra no stack sem justificativa que passe o teste "se eu tirar isso amanhã, o que quebra?". Versões são pinadas por **major** (caret `^`), não por exato — para receber patches de segurança automaticamente via `npm audit fix`.

---

## 2. Dependências runtime (go para `dependencies`)

### 2.1. Database, Auth, Storage

| Pacote                  | Versão alvo | Justificativa                                                                                                                                                    |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/supabase-js` | `^2`        | Client oficial Supabase. Abstrai Postgres/Auth/Storage. Usado em server e client.                                                                                |
| `@supabase/ssr`         | `^0.5`      | Helper específico para Next.js App Router — gerencia cookies de auth entre Server Components e Route Handlers. Sem ele, autenticação server-side vira improviso. |

### 2.2. Estado client-side

| Pacote                           | Versão | Justificativa                                                                                                                                                                        |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zustand`                        | `^5`   | Store para **carrinho** (`stores/cart-store.ts`). Escolhido sobre Redux porque: sem boilerplate, API pequena, serialização para `localStorage` com middleware `persist` em 3 linhas. |
| `@tanstack/react-query`          | `^5`   | Fetch, cache, invalidação, refetch para dados server-side consumidos em Client Components. Crítico para drawer de carrinho que atualiza widget em tempo real.                        |
| `@tanstack/react-query-devtools` | `^5`   | Só em dev — inspeção de queries. Devdependency? Não — é pensado para convivência com code cliente; fica em `dependencies` mas só importado condicionalmente.                         |

### 2.3. Forms e validação

| Pacote                | Versão | Justificativa                                                                                      |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `react-hook-form`     | `^7`   | Forms performantes sem re-render a cada keystroke. Essencial no checkout (endereço + pagamento).   |
| `zod`                 | `^3`   | Validação schema-first. Mesmo schema compartilhado entre server (Server Actions) e client (forms). |
| `@hookform/resolvers` | `^3`   | Adaptador que liga `react-hook-form` a `zod`.                                                      |

### 2.4. UI primitives

| Pacote                            | Versão   | Justificativa                                                                            |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `@radix-ui/react-dialog`          | `^1`     | Base para modais e drawer de carrinho. Acessibilidade nativa (focus trap, ESC, aria-\*). |
| `@radix-ui/react-popover`         | `^1`     | Tooltips e popovers inline (ex: ajuda no checkout).                                      |
| `@radix-ui/react-dropdown-menu`   | `^2`     | Menus (ex: conta, mobile menu).                                                          |
| `@radix-ui/react-tabs`            | `^1`     | Tabs (ex: meus pedidos ativos vs concluídos).                                            |
| `@radix-ui/react-slot`            | `^1`     | `asChild` pattern — permite compor CTAs com `<Link>`.                                    |
| `@radix-ui/react-label`           | `^2`     | Label acessível para forms.                                                              |
| `@radix-ui/react-checkbox`        | `^1`     | Checkbox acessível (opt-in WhatsApp, aceite de termos).                                  |
| `@radix-ui/react-radio-group`     | `^1`     | Seletor de método de pagamento.                                                          |
| `@radix-ui/react-visually-hidden` | `^1`     | Título acessível de drawers sem poluição visual.                                         |
| `sonner`                          | `^1`     | Toasts. Mais leve e melhor DX que construir sobre Radix Toast. Acessível por padrão.     |
| `lucide-react`                    | `latest` | Ícones (tree-shakeable, padrão no ecossistema React). 1k+ ícones; usaremos <20.          |

**Não vai:** `shadcn/ui` como dependência. Preferimos copiar padrões que gostamos e manter controle total do markup. Radix resolve a parte difícil (acessibilidade).

### 2.5. Utility helpers

| Pacote           | Versão | Justificativa                                                                                                                                                         |
| ---------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clsx`           | `^2`   | Concatenação condicional de classes. Tiny (~200b).                                                                                                                    |
| `tailwind-merge` | `^2`   | Resolve colisão de classes Tailwind (ex: `p-4` + `p-8`). Fica em uma função `cn()` em `lib/utils.ts`.                                                                 |
| `date-fns`       | `^3`   | Datas (previsão de entrega, horário de funcionamento). Tree-shakeable — só a função usada entra no bundle. Escolhido sobre `dayjs`/`moment` pela ergonomia funcional. |

### 2.6. Analytics

| Pacote       | Versão | Justificativa                                                                                                                 |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `posthog-js` | `^1`   | Cliente web — events de navegação, funnel, experimentos A/B. Essencial para medir migração iFood→site (metas da AI v1 §22.4). |

**Não vai:** `posthog-node` por enquanto. Instrumentação server-side pode esperar; events críticos de produto são todos client-side no MVP.

### 2.7. Pagamento (Pagar.me)

**Decisão:** **não usar SDK oficial**. Integração via **REST direto** com `fetch` + wrapper tipado em `server/pagarme/client.ts`.

Justificativa:

- O SDK oficial (`@pagarme/pagarme-nodejs-sdk`) tem histórico irregular de manutenção.
- A API REST v5 do Pagar.me é estável e documentada.
- `fetch` é nativo no Node 20+ e no browser.
- Controle total sobre erros, retry, timeout.
- **0 deps adicionadas** ao bundle.

### 2.8. WhatsApp Cloud API

**Decisão:** igual ao Pagar.me — REST direto via `fetch`. WhatsApp Cloud API é REST, não precisa de SDK.

---

## 3. Dependências de desenvolvimento (go para `devDependencies`)

### 3.1. Formatação

| Pacote                        | Versão | Justificativa                                                               |
| ----------------------------- | ------ | --------------------------------------------------------------------------- |
| `prettier`                    | `^3`   | Formatador (Prettier já é esperado pelo hook do Claude Code).               |
| `prettier-plugin-tailwindcss` | `^0.6` | Ordena automaticamente classes Tailwind (ordem canônica). Reduz diff em PR. |

### 3.2. Testes

| Pacote                        | Versão | Justificativa                                                           |
| ----------------------------- | ------ | ----------------------------------------------------------------------- |
| `vitest`                      | `^2`   | Unit + component tests. Mais rápido que Jest, compatível com TS nativo. |
| `@vitest/ui`                  | `^2`   | UI para rodar/debugar testes localmente.                                |
| `@vitejs/plugin-react`        | `^4`   | Necessário para Vitest compilar JSX.                                    |
| `@testing-library/react`      | `^16`  | Padrão para testar componentes React.                                   |
| `@testing-library/jest-dom`   | `^6`   | Matchers extras (`toBeInTheDocument`, etc).                             |
| `@testing-library/user-event` | `^14`  | Simulação realista de interação do usuário.                             |
| `jsdom`                       | `^25`  | Ambiente DOM para Vitest.                                               |
| `@playwright/test`            | `^1`   | E2E do fluxo crítico "visita → compra".                                 |

### 3.3. Types que faltam

| Pacote                                            | Versão | Justificativa        |
| ------------------------------------------------- | ------ | -------------------- |
| `@types/node`                                     | `^20`  | Já veio no scaffold. |
| _(Supabase/React/Next já trazem tipos próprios.)_ |        |                      |

---

## 4. Decisão — estrutura inicial de arquivos

Antes da primeira feature, criar os arquivos de fundação na ordem abaixo.

### 4.1. `src/styles/ds-tokens.css` (novo — tokens do DS v1.1 como CSS variables)

Arquivo dedicado, importado por `globals.css`. **Única fonte da verdade** dos tokens no código.

```css
@theme {
  /* === PALETA — v1.1 (conforme DS §2) === */

  /* Primárias */
  --color-olive-900: #2b3210; /* brand.dark — texto, CTA primário */
  --color-olive-500: #505631; /* brand.olive — CTA alternativo, ícone-coração */
  --color-terra-500: #de6e27; /* brand.terracota — widget de economia */

  /* Secundárias */
  --color-paper-50: #fbf8ef; /* surface.page — fundo principal */
  --color-paper-100: #e5e2d9; /* surface.soft — bloco secundário */
  --color-sage-300: #b8c0a8; /* decorativo */
  --color-olive-700: #3c4221; /* olive-soft — hover dark, texto sec. */
  --color-terra-700: #b4551d; /* terra-deep — CTA comercial, link */

  /* Neutras */
  --color-divider: #d6d2c4;
  --color-pure-white: #ffffff;

  /* Estados */
  --color-success: #5d7a37;
  --color-warning: #d89527;
  --color-error: #a63d27;
  --color-info: #3d5063;

  /* Aliases semânticos */
  --color-text-primary: var(--color-olive-900);
  --color-text-secondary: var(--color-olive-700);
  --color-text-inverse: var(--color-paper-50);

  /* === TIPOGRAFIA === */
  --font-sans: var(--font-inter); /* setado pelo next/font */
  --font-serif: var(--font-playfair); /* setado pelo next/font */
  --font-script: var(--font-caveat); /* setado pelo next/font */

  /* Scale */
  --text-display: 3rem; /* 48px */
  --text-h1: 2.25rem; /* 36px */
  --text-h2: 1.75rem; /* 28px */
  --text-h3: 1.375rem; /* 22px */
  --text-body-lg: 1.125rem; /* 18px */
  --text-body: 1rem; /* 16px */
  --text-body-sm: 0.875rem; /* 14px */
  --text-caption: 0.75rem; /* 12px */
  --text-cta: 1rem; /* 16px */
  --text-price: 1.25rem; /* 20px */
  --text-price-big: 2rem; /* 32px */

  /* === RADIUS === */
  --radius-xs: 0.25rem; /* 4px */
  --radius-sm: 0.5rem; /* 8px */
  --radius-md: 0.75rem; /* 12px */
  --radius-lg: 1.25rem; /* 20px */
  --radius-pill: 9999px;

  /* === SHADOWS === */
  --shadow-sm: 0 1px 2px rgba(43, 50, 16, 0.06);
  --shadow-md: 0 4px 12px rgba(43, 50, 16, 0.08);
  --shadow-lg: 0 12px 32px rgba(43, 50, 16, 0.12);
}
```

No Tailwind 4, o bloco `@theme` torna automaticamente disponíveis as classes correspondentes (`bg-olive-900`, `text-terra-500`, `font-serif`, `shadow-md`, `rounded-md`, etc).

### 4.2. `src/app/globals.css` (substituir conteúdo do scaffold)

```css
@import "tailwindcss";
@import "../styles/ds-tokens.css";

:root {
  color-scheme: light;
}

html,
body {
  background: var(--color-paper-50);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

/* Foco acessível global */
*:focus-visible {
  outline: 2px solid var(--color-olive-500);
  outline-offset: 2px;
}
```

Remover o CSS de exemplo do scaffold (variáveis `--background`, `--foreground`, dark mode via `prefers-color-scheme`). Dark mode **não está no MVP**.

### 4.3. `src/app/layout.tsx` (substituir fontes do scaffold)

Substituir `Geist` por nossas 3 famílias via `next/font/google`:

```tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veg.ana — doces sem lactose em BH",
  description:
    "Doceria vegana feita à mão em Belo Horizonte. Bolos, bombons e bolo no pote sem lactose e sem ingredientes de origem animal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

Mudanças vs scaffold:

- Fontes: Geist → Inter + Playfair Display + Caveat
- `lang="en"` → `lang="pt-BR"`
- Metadata com título e descrição reais (aplicando Brand Voice)

### 4.4. `src/lib/utils.ts` (utilitário `cn`)

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### 4.5. `src/lib/format.ts` (formatadores comuns)

```ts
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatCEP(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
```

### 4.6. `package.json` — scripts e configuração

Adicionar scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "e2e": "playwright test",
    "verify": "npm run format:check && npm run lint && npm run typecheck && npm run test -- --run"
  },
  "prettier": {
    "plugins": ["prettier-plugin-tailwindcss"],
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 100
  }
}
```

### 4.7. `.gitignore` (confirmar conteúdo — o scaffold cria um básico)

Validar que contém:

```
node_modules/
.next/
.env.local
.env*.local
coverage/
playwright-report/
test-results/
.DS_Store
```

### 4.8. `src/app/page.tsx` — placeholder temporário

Substituir o placeholder do scaffold por algo minimal que valida fontes e cores:

```tsx
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-script text-h2 text-olive-500">Veg.ana</p>
      <h1 className="mt-4 font-serif text-display text-olive-900 italic">Em breve.</h1>
      <p className="mt-6 text-body-lg text-olive-700">
        Doces sem lactose feitos à mão em Belo Horizonte.
      </p>
      <a
        href="https://www.ifood.com.br/delivery/belo-horizonte-mg/vegana---confeitaria-vegana-serra/733bb5c4-06e6-4dd3-8f39-7162c716fa92"
        className="mt-12 rounded-sm bg-olive-900 px-6 py-3 text-cta text-paper-50 transition hover:bg-olive-700"
      >
        Peça no iFood
      </a>
    </main>
  );
}
```

Esta página é **provisória** — apenas para validar fontes, cores e que o build roda. Será substituída quando a Home real entrar.

---

## 5. Ordem de instalação

Executar nesta ordem para minimizar conflitos:

```bash
cd Site/app

# 1. Base
npm install

# 2. Runtime — grupos separados por área
npm install @supabase/supabase-js @supabase/ssr
npm install zustand @tanstack/react-query @tanstack/react-query-devtools
npm install react-hook-form zod @hookform/resolvers
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-visually-hidden
npm install sonner lucide-react clsx tailwind-merge date-fns
npm install posthog-js

# 3. Dev
npm install -D prettier prettier-plugin-tailwindcss
npm install -D vitest @vitest/ui @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test

# 4. Primeira verificação
npm run dev       # deve abrir localhost:3000 com "Veg.ana — Em breve"
npm run typecheck # zero erros
```

---

## 6. Consequências

### Positivas

- **Stack completa e coerente** antes da primeira feature.
- Tokens do DS disponíveis como classes Tailwind automaticamente, sem config manual.
- Prettier + hook do Claude Code cuidam de formato sem esforço manual.
- Testes prontos (Vitest + Playwright) — escrita de teste desde o primeiro componente.
- **Nenhuma dependência grande desnecessária** — sem UI library gigante, sem ORM pesado.
- Integrações críticas (Pagar.me, WhatsApp) via REST direto — 0 acoplamento a SDK de terceiros.
- Supabase com `@supabase/ssr` dá cookie-based auth correto para Next.js App Router.

### Negativas

- **Tamanho do bundle** inicial — Radix primitives + TanStack Query somam ~60kb gzip. Aceitável dado o benefício de acessibilidade e estado robusto.
- **Vendor lock-in** do Supabase — mudar provedor depois envolve migração Postgres + rewrite da camada de auth/storage. Decisão consciente: trade-off de velocidade vs portabilidade.
- **Tailwind 4 é relativamente novo** — ecossistema de plugins ainda alcançando. `prettier-plugin-tailwindcss` versão `^0.6` suporta v4 (confirmar no install).
- **Upgrade de Next 16 para 17** (quando vier) pode exigir migração. Mantemos pinado em `^16` no package.json.

### A monitorar

- Volume de warnings do ESLint 9 (config flat) vs antiga — pode exigir ajuste de rules.
- Performance do Turbopack em produção (Next 16 usa Turbopack por padrão).
- Quando a primeira página produto for implementada, fazer um Lighthouse baseline e comparar com metas da AI v1 §19.

---

## 7. Alternativas consideradas

### 7.1. `shadcn/ui` como source-of-truth de componentes

- **Vantagem:** componentes prontos, copia-cola no repo.
- **Descartado porque:** traz convenções próprias (tokens diferentes, variantes), duplicaria esforço com nosso DS v1.1. Melhor usar os primitives (Radix) e construir exatamente nossos componentes.

### 7.2. `@pagarme/pagarme-nodejs-sdk`

- **Vantagem:** wrapper pronto.
- **Descartado porque:** histórico irregular de manutenção + abstração fina demais (REST direto é simples).

### 7.3. Redux Toolkit em vez de Zustand

- **Descartado porque:** boilerplate desproporcional ao escopo (um store de carrinho). Zustand é ~3kb vs 13kb.

### 7.4. SWR em vez de TanStack Query

- **Descartado porque:** TanStack Query tem devtools superiores, API de mutation mais completa, e suporta query invalidation granular (crítico para cross-sell reagir a add-to-cart).

### 7.5. Jest em vez de Vitest

- **Descartado porque:** Vitest é 3–5× mais rápido em dev, compat com TS nativo, mesma API do Jest (zero learning curve).

### 7.6. Cypress em vez de Playwright para e2e

- **Descartado porque:** Playwright tem multi-browser nativo, API menos magical, debugging superior (trace viewer).

### 7.7. PWA com `next-pwa`

- **Adiado para v1.1.** PWA é parte do escopo do MVP (AI v1 §16), mas adicionar service worker antes da primeira feature atrapalha debugging. Entra depois que a home e o fluxo de compra estiverem estáveis, via `serwist` (ou manualmente). Registrar como ADR 0002 quando chegar lá.

### 7.8. `@sentry/nextjs` para monitoramento

- **Adiado para pós-deploy.** Sem sentido instrumentar erros antes de ter tráfego.

---

## 8. Referências

- AI v1 do site: `Site/Arquitetura de Informacao v1.md` §2 (stack), §13 (schema), §14 (auth), §15 (pagamento)
- DS v1.1: `Marca/Design System v1.md` §2 (cores), §3 (tipografia), §4–§6 (espaçamento/radius/sombras)
- Brand Voice: `Marca/Brand Voice Guide.md` §4 (vocabulário), §6 (padrões por peça)
- CLAUDE.md técnico: `Site/app/CLAUDE.md`
- Docs Next.js 16: `node_modules/next/dist/docs/` (após install) — ler antes de usar API nova
- Docs Tailwind 4: https://tailwindcss.com/docs

---

## 9. Execução — o que fazer depois da aprovação deste ADR

1. Rodar a sequência de install da seção 5.
2. Criar `src/styles/ds-tokens.css` (conteúdo da 4.1).
3. Substituir conteúdo de `src/app/globals.css` (4.2).
4. Substituir conteúdo de `src/app/layout.tsx` (4.3).
5. Criar `src/lib/utils.ts` (4.4) e `src/lib/format.ts` (4.5).
6. Adicionar scripts e config no `package.json` (4.6).
7. Validar `.gitignore` (4.7).
8. Substituir `src/app/page.tsx` pelo placeholder (4.8).
9. Rodar `npm run dev` — conferir que a home provisória carrega com as fontes, cores e Brand Voice corretos.
10. Rodar `npm run typecheck` — zero erros.
11. Rodar `npm run format` — padroniza tudo.
12. ✅ Subprojeto em estado-base. Próximo ADR (0002) começa quando abrirmos a primeira feature real (provavelmente o Card de Produto + página `/produtos`).
