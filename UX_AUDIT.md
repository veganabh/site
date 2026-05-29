# Auditoria de UX & Design System — Veg.ana (site)

> Auditoria **somente-leitura** do código em `Site/app/`. Gerado em 2026-05-29.
> Contagens obtidas via `grep` agregado sobre `src/**/*.tsx` (≈103 arquivos de componente).
> Nenhum arquivo de código foi alterado.

---

## 1. Stack e ferramentas

| Item | Valor |
|------|-------|
| Framework | **Next.js 16.2.4** (App Router, Server Components default, **Turbopack**) |
| UI runtime | **React 19.2.4** / react-dom 19.2.4 |
| Linguagem | **TypeScript 5** (estrito) |
| Gerenciador de pacotes | **npm** (sem lockfile alternativo) |
| Bundler/build | Turbopack (dev `next dev -p 3100` + build `next build`) |
| Estilização | **Tailwind CSS v4** (`@tailwindcss/postcss`) — abordagem CSS-first, **sem `tailwind.config`** |
| Tokens | CSS variables via `@theme` em `src/styles/ds-tokens.css` |
| Utilitário de classes | `clsx` + `tailwind-merge` (helper `cn`, 62 imports de `@/lib/utils`) |

**Libs de UI instaladas** (de `package.json`):
- **Radix UI** (13 pacotes): `react-dialog`, `react-dropdown-menu`, `react-select`, `react-popover`, `react-tabs`, `react-checkbox`, `react-radio-group`, `react-slider`, `react-switch`, `react-label`, `react-slot`, `react-visually-hidden`.
- **lucide-react 1.8.0** (ícones — sem brand icons, Instagram é SVG inline).
- **sonner 2.0.7** (toast).
- **react-hook-form 7.72 + @hookform/resolvers 5.2 + zod 4.3** (forms).
- **zustand 5.0** (estado client), **@tanstack/react-query 5.99** (server-state).
- **leaflet 1.9 + react-leaflet 5** (mapa de zonas), **lottie-react 2.4** (animações).
- **NÃO há** shadcn/ui, MUI, Chakra, Ant, Headless UI. Decisão intencional (CLAUDE.md): primitivos próprios sobre Radix + Tailwind.

---

## 2. Infraestrutura de tema / tokens (estado atual)

- **`tailwind.config`?** Não existe (Tailwind v4 CSS-first). Toda config vive em `@theme` no CSS.
- **Arquivo central de tokens:** `src/styles/ds-tokens.css` (importado em `src/app/globals.css` após `@import "tailwindcss"`). Resumo do `@theme`:

**Cores** (todas como `--color-*`):
```
olive-900 #2b3210 · olive-700 #3c4221 · olive-500 #505631
terra-500 #de6e27 · terra-700 #b4551d
paper-50 #fbf8ef · paper-100 #e5e2d9 · sage-300 #b8c0a8
leaf-500 #6b9f41 · leaf-700 #4e7a2e · divider #d6d2c4
success #5d7a37 · warning #d89527 · error #a63d27 · info #3d5063
```

**Tipografia** — família única `--font-sans: var(--font-inter)`. Escala nomeada:
```
display 3rem · h1 2.25 · h2 1.75 · h3 1.375 · body-lg 1.125 · body 1 ·
body-sm 0.875 · caption 0.75 · cta 1 · price 1.25 · price-big 2  (+ line-heights)
```

**Radius** (recém-colapsado de propósito):
```
xs 0.25rem · sm 0.5 · md 0.5 · lg 0.5 · xl 0.5 · 2xl 0.5 · 3xl 0.5 · pill 9999px
```

**Sombras:** `sm` `md` `lg` (todas `rgba(43,50,16,*)`). **Não há** `xl`.

- **CSS variables `:root`:** 5 aliases semânticos — `--color-text-primary/secondary/inverse`, `--color-surface-page/soft` (apontam pros tokens). Expostos só como `var()`, não como classe.

### VEREDITO: **Parcial.**
Existe uma fonte única (`ds-tokens.css`), **mas é amplamente contornada no código**: 480 `font-size` arbitrários, ~46 cores do DS escritas como **hex literal** em `.tsx`, e 8 nomes de radius distintos para 2 valores efetivos. A intenção do DS está documentada; a aplicação é inconsistente.

---

## 3. Inventário de inconsistências

> Contagens aproximadas por nº de ocorrências em `src/**/*.tsx`.

### Border-radius — **8 classes, 2 valores efetivos**
| Classe | Ocorrências | Valor atual (token) |
|--------|-------------|---------------------|
| `rounded-md` | 154 | 0.5rem |
| `rounded-pill` | 112 | 9999px |
| `rounded-full` | 100 | 9999px |
| `rounded-lg` | 75 | 0.5rem |
| `rounded-sm` | 69 | 0.5rem |
| `rounded-2xl` | 37 | 0.5rem |
| `rounded-xl` | 30 | 0.5rem |
| `rounded` (bare) | 13 | 0.25rem (default) |
| `rounded-t-lg`/`-t-2xl`/`-br-lg` | 2+2+2 | 0.5rem |

> **Quase-iguais:** `rounded-pill` (112) **vs** `rounded-full` (100) expressam a MESMA intenção (full round) com classes diferentes. E `md/lg/sm/xl/2xl` agora renderizam idêntico (0.5rem) mas o código mantém **5 nomes** — falsa hierarquia. `rounded` bare (13) cai em 0.25rem (xs), divergindo dos vizinhos.

### Cores — **hex literais espalhados (~50 ocorrências em `.tsx`)**
Cores do DS escritas como hex em vez de classe/`var()` (CLAUDE.md §4: "Nunca hex solto"):
```
#fbf8ef ×13 · #de6e27 ×9 · #2b3210 ×9 · #505631 ×5 · #b4551d ×3 ·
#3c4221 ×3 · #e5e2d9 ×2 · #d89527 ×2 · #b8c0a8 ×2
```
Fora da paleta: **`#ffffff` ×2** (branco puro — note que NÃO é igual a `paper-50 #fbf8ef`) + `bg-white` ×2. Paleta de gradiente do placeholder em `src/components/features/product-photo.tsx` (`#f1d9c6`, `#e5d5c3`, `#c9a98a`, `#d4d9c4`) — hardcoded (intencional, mas fora do token).

### Espaçamentos — **consistente (ponto forte)**
Quase tudo na escala Tailwind. Arbitrários: só `p-[72px]` ×3. `gap-[..]` arbitrário: **0**.

### Tipografia — **maior inconsistência do projeto**
- **480** `font-size` arbitrários (`text-[Npx]`) **vs 522** classes nomeadas (`text-body-sm`, `text-caption`, etc.) → ~48% bypassa a escala.
- ~20 tamanhos px distintos. Top: `text-[11px]` ×132 · `text-[12px]` ×123 · `text-[10px]` ×80 · `text-[13px]` ×75 · `[14px]` ×12 · `[24px]` ×8 · `[20px]` ×6.
- **Meio-pixel:** `text-[11.5px]` ×6 e `text-[10.5px]` ×4 — não renderizam nítido.
- **Quase-iguais:** 10/11/12/13px competem com `caption` (12px=0.75rem) e `body-sm` (14px=0.875rem). A escala DS **não tem** 10/11/13px → o código criou um sub-sistema paralelo de px.
- Pesos: `font-semibold` ×405 · `font-bold` ×180 · `font-medium` ×40 · `font-extrabold` ×10 · `font-normal` ×4. Família única (Inter). Consistente.

### Sombras — **quase consistente**
`shadow-sm` ×66 · `shadow-lg` ×22 · `shadow-md` ×15 · `shadow-xl` ×1 (**fora do token** — usa default Tailwind) · `shadow-` ×1 (classe quebrada/incompleta — provável bug).

### Bordas
Padrão dominante `border border-divider` (1px, cor `#d6d2c4`) — consistente. Sem larguras arbitrárias relevantes.

### Breakpoints / z-index / transições
- **Breakpoints:** `md:` ×137 (dominante, mobile-first) · `xl:` ×32 · `sm:` ×31 · `lg:` ×9 · `2xl:` **×0** (nunca usado). `lg` subutilizado.
- **z-index:** `z-50` ×17 · `z-40` ×10 · `z-20` ×5 · `z-30` ×4 · `z-10` ×3 — escala Tailwind, sem `z-[..]` arbitrário. Consistente.
- **Durações:** `duration-300` ×5 · `duration-500` ×4 · `duration-200` ×3 · `duration-150` ×2 — 4 valores, baixo volume.

---

## 4. Variantes de componentes

**Primitivos compartilhados** vivem em `src/components/ui/` — **apenas 3 arquivos**:
| Primitivo | Arquivo | Variantes |
|-----------|---------|-----------|
| Badge | `ui/badge.tsx` | 2 (`soft` \| `strong`) |
| Select | `ui/select.tsx` | 1 composto Radix (Trigger/Content/Item, prop `hasError`) |
| Toggle | `ui/toggle.tsx` | 1 (Radix) |

**Primitivos AUSENTES (estilizados ad-hoc, inline, em cada uso):**
- **Botão:** sem `ui/button`. Padrão repetido `bg-olive-900 hover:bg-olive-700 ... text-cta` reescrito em dezenas de componentes (ProductCard, checkout, forms admin, quick-actions…). Alto risco de divergência.
- **Input:** sem `ui/input`. Inputs manuais nos forms (`features/cardapio/produto-form.tsx`, checkout, admin).
- **Card:** sem `ui/card`. Padrão `rounded-* border border-divider bg-paper-50 p-* shadow-sm` reescrito por toda parte.
- **Modal/Dialog:** **5+** diálogos ad-hoc usando `@radix-ui/react-dialog` direto (`*-form-dialog.tsx`, `cancel-reason-dialog.tsx`, `kit-delivery-gate.tsx`, `import-csv-dialog.tsx`, `AddressFormModal` em checkout) — sem casca compartilhada.
- **Tabela:** `features/rings-table.tsx` (1, ad-hoc) + a tabela inline de `cardapio-list.tsx`.
- **Toast:** **sonner SIM integrado** — `<Toaster position="bottom-center" richColors closeButton />` em `src/app/layout.tsx`; `toast.*()` usado (ex. `import-csv-dialog.tsx`). _(Correção: existe; não é primitivo próprio, é o do sonner.)_
- **Status badge:** `features/order-status-badge.tsx` — **6 variantes** config-driven (NOVO/PREPARANDO/PRONTO/A_CAMINHO/ENTREGUE/CANCELADO).

**Organização:** 103 `.tsx` em `src/components/`, agrupados **por feature** (não por nível de abstração):
`features/` 27 · `admin/` 25 · `dashboard/` 14 · `providers/` 13 · `layout/` 7 · `gift/` 5 · `conta/` 4 · `checkout/` 3 · `ui/` 3 · `auth/` 2.

**Mais reutilizados (por nº de imports):**
| # | Módulo | Imports |
|---|--------|---------|
| 1 | `@/lib/utils` (cn/format) | 62 |
| 2 | `@/lib/format` | 27 |
| 3 | `@/stores/menu-store` | 14 |
| 4 | `@/stores/admin-orders-store` | 14 |
| 5 | `@/stores/cart-store` | 12 |
| 6 | `features/admin-gate` | 9 |
| 7 | `features/product-photo` | 6 |
| 8 | `gift/kit-cover-photo` | 4 |
| 9 | `features/order-status-badge` | 3 |
| 10 | `dashboard/dashboard-shell` | 3 |

---

## 5. Ambiente Claude Code deste projeto

**`.claude/`** (na raiz do projeto Vegana, `pessoal/vegana/.claude/`):
- **Agents ativos (6):** `vegana-bh-lead` (Opus, orquestrador master), `product-engineering-orchestrator` (Sonnet), `site-architect` (Opus), `frontend-engineer` (Sonnet), `backend-engineer` (Sonnet), **`ds-compliance-reviewer` (Haiku — gate de tokens DS/contraste/tipografia)**.
- **Agents inativos (9):** persona-guardian, content-orchestrator, brand-voice-keeper, visual-director, finance-orchestrator, ifood-report-reader, sku-analyst, pricing-strategist, promo-economist (em `_inactive/`).
- **Skills ativas (3):** `db-schema`, **`new-component`** (template com tokens DS + Vitest), `new-route`. Inativas: `brand-voice`, `margin-check`.
- Outros: `.claude/README.md`, `.claude/INDEX.md` (mapa vivo de agents/skills), `launch.json`, `settings.local.json` (allow-list extensa de Bash/MCP), `scheduled_tasks.lock`.

**CLAUDE.md** — há **dois** (+ `AGENTS.md`):
- `pessoal/vegana/CLAUDE.md` (estratégico): posicionamento "premium acessível com inclusão cruzada", 4 personas, **5 filtros obrigatórios**, tom de comunicação, fase ativa.
- `Site/app/CLAUDE.md` (técnico): stack, convenções de naming/export, **regra "nunca hex solto, sempre token DS"**, gates de qualidade (typecheck/lint/test/format), quando criar ADR.
- `Site/app/AGENTS.md`: aviso "este Next.js 16 tem breaking changes — leia os docs".

**`.mcp.json`** (raiz Vegana — **não há `Site/app/.mcp.json` separado**): 3 servidores —
- `ux-audit` → `@elsahafy/ux-mcp-server@5` (stdio).
- `supabase` → http, `project_ref=ydiyyjktbscodiqilbat`.
- `abacate-pay` → http, header `Bearer ${ABACATEPAY_API_KEY}`.

**Plugin/skill de design:** não há plugin tipo "frontend-design". O papel de DS é coberto por **3 mecanismos próprios**: o agent `ds-compliance-reviewer` (gate), a skill `new-component` (template com tokens) e o MCP `ux-audit`.

---

## 6. Riscos / observações

1. **Refator de tipografia é o de maior risco e maior retorno.** Migrar os 480 `text-[Npx]` para a escala nomeada esbarra num fato: a escala DS tem `caption=12px` e `body-sm=14px`, mas o código usa massivamente **10/11/13px** (e meio-pixels). Não há mapeamento 1:1 — é preciso **primeiro decidir a escala** (adicionar steps de 10/11/13 ou arredondar tudo pra 12/14), senão o refator muda tamanhos visíveis.
2. **Radius já colapsado.** `md/lg/xl/2xl/3xl` valem todos 0.5rem hoje. Qualquer tentativa futura de "reintroduzir hierarquia" afeta 5 famílias de classe em ~400 ocorrências. Além disso `rounded-pill` vs `rounded-full` deveriam ser unificados.
3. **Hex literais ≠ tokens.** Trocar hex por classe pode **mudar a cor** onde divergem: `#ffffff` (×2) e `bg-white` (×2) NÃO são `paper-50 (#fbf8ef)`. Auditar caso a caso antes de substituir.
4. **Ausência de primitivos Button/Input/Card.** Sem eles, cada ajuste de estilo é multi-arquivo e propenso a divergência — é a causa-raiz da maioria das inconsistências acima. Extrair esses 3 primitivos é o passo de fundação.
5. **Acessibilidade frágil:**
   - Fontes muito pequenas: `text-[9px]` ×5, `text-[10px]` ×80, `text-[10.5px]` ×4, `text-[11px]` ×132 — boa parte abaixo de 12px, prejudica legibilidade (e meio-pixel borra).
   - Alvos de toque: vários botões/ícones com `h-6`/`h-7`/`w-6` (24–28px) < 44×44px (WCAG 2.5.5) — ex. controles de estoque em `cardapio-list.tsx`, ações de linha. Verificar individualmente.
   - Contraste: `text-olive-700/50` e `text-olive-700/45` (texto com opacidade) sobre paper podem cair abaixo de 4.5:1 — checar com `ux-audit`/`check_contrast`.
6. **Responsividade desigual:** `md:` domina (137), mas `lg:` (9) e `2xl:` (0) quase ausentes — telas grandes (≥1280px) podem não aproveitar o espaço. `DashboardShell` usa grid `xl:`, mas a maioria das telas para no `md`.
7. **Sujeira pontual:** `shadow-` (classe incompleta, 1×) e `shadow-xl` (1×, fora do token) — corrigir; `rounded` bare (13×) diverge dos vizinhos.

---

### Resumo executivo
Fundação de tokens existe e é boa (cores + escala tipográfica + sombras bem definidas em `ds-tokens.css`), e **espaçamento/z-index/sombra estão consistentes**. Os três focos de dívida, em ordem de impacto: **(1) tipografia** (480 px arbitrários vs escala), **(2) ausência de primitivos Button/Input/Card**, **(3) hex literais + radius com nomes redundantes**. Resolver (2) destrava (1) e (3) — um conjunto de primitivos que consome os tokens vira o ponto único de aplicação.
