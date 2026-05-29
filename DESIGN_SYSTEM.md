# Design System — Veg.ana (contrato canônico)

> **Fonte de verdade operacional do código.** Toda criação/edição de UI segue este doc.
> Relação: `../../Marca/Design System v1.md` (decisões de marca) → `src/styles/ds-tokens.css` (tokens implementados, `@theme` Tailwind v4) → **este doc** (regras de uso no código).
> **Regra de ouro:** nunca hex nem px solto. Sempre token (`var(--…)`) ou classe Tailwind mapeada.
> Decisões formais: ver `docs/adr/0011-consolidacao-design-system.md`. Auditoria que originou: `UX_AUDIT.md`.
> Marcações: 🆕 novo · ✏️ muda · ⛔ proibido/deprecado.

---

## 1. Cores

Definidas em `ds-tokens.css` (`@theme`, `--color-*`). Usar sempre a **classe** (`bg-olive-900`, `text-terra-700`…), nunca o hex.

| Token | Hex | Classe | Uso |
|-------|-----|--------|-----|
| olive-900 | `#2b3210` | `*-olive-900` | texto primário, superfície escura (sidebar, botão primary) |
| olive-700 | `#3c4221` | `*-olive-700` | texto secundário |
| olive-500 | `#505631` | `*-olive-500` | texto terciário / ícone apagado |
| terra-500 | `#de6e27` | `*-terra-500` | acento/ação, destaque |
| terra-700 | `#b4551d` | `*-terra-700` | acento hover/escuro |
| paper-50 | `#fbf8ef` | `*-paper-50` | **superfície padrão** (página, card, input, dialog) |
| paper-100 | `#e5e2d9` | `*-paper-100` | superfície soft (header de card, chip neutro) |
| sage-300 | `#b8c0a8` | `*-sage-300` | apoio/disabled suave |
| leaf-500 / leaf-700 | `#6b9f41` / `#4e7a2e` | `*-leaf-*` | sucesso/positivo (em estoque, ativo) |
| divider | `#d6d2c4` | `*-divider` | bordas (padrão `border border-divider`, 1px) |
| success | `#5d7a37` | `*-success` | estado funcional |
| warning | `#d89527` | `*-warning` | estado funcional |
| error | `#a63d27` | `*-error` | erro/danger |
| info | `#3d5063` | `*-info` | informativo |

**Aliases semânticos** (`:root`, só via `var()` — não são classe Tailwind): `--color-text-primary/secondary/inverse`, `--color-surface-page/soft`.

### Regra do branco (D3) ✏️
- **Default:** toda superfície = `paper-50` (ou `paper-100`). `paper-50` (#fbf8ef, off-white quente) **não** é branco puro.
- `#ffffff` / `bg-white` permitido **só** com elevação/contraste intencional sobre foto/mídia, e **comentário inline** justificando: `/* branco intencional: elevação sobre foto */`. Sem justificativa → `bg-paper-50`.
- ⛔ Hex de cor literal em `.tsx`. Exceção **whitelist documentada:** paleta de gradiente do placeholder em `src/components/features/product-photo.tsx` (cores fora da marca, intencionais p/ placeholder).

---

## 2. Tipografia (D1)

Família única **Inter** (`--font-sans: var(--font-inter)`, via `next/font` em `layout.tsx`). Usar **sempre** classe nomeada — ⛔ `text-[Npx]` arbitrário.

| Token (classe) | rem / px | line-height | Papel |
|----------------|----------|-------------|-------|
| `text-display` | 3rem / 48 | 1.1 | hero |
| `text-h1` | 2.25rem / 36 | 1.15 | título de página |
| `text-h2` | 1.75rem / 28 | 1.2 | seção |
| `text-h3` | 1.375rem / 22 | 1.25 | título de card/dialog |
| `text-body-lg` | 1.125rem / 18 | 1.5 | lead |
| `text-body` | 1rem / 16 | 1.55 | corpo padrão |
| `text-body-sm` | 0.875rem / 14 | 1.5 | corpo secundário, **input**, **label** (`+ font-semibold`) |
| `text-caption` | 0.75rem / 12 | 1.4 | **piso** — legenda, hint, badge |
| `text-micro` 🆕 | 0.6875rem / 11 | 1.35 | **único <12px**: metadado fino (ETA, contador, riscado iFood, chip-overlay) |
| `text-cta` | 1rem / 16 | 1 | botão |
| `text-price` | 1.25rem / 20 | 1 | preço |
| `text-price-big` | 2rem / 32 | 1 | preço destacado |

**Mapa de migração por papel** (não 1:1 — guia para o refator F3):

| px legado | → token | regra |
|-----------|---------|-------|
| 9 | `text-micro` ou remover | <11 proibido |
| 10 / 10.5 | `text-micro` | metadado fino; mata meio-pixel |
| 11 | `text-micro` (metadado) **ou** `text-caption` (texto lido com atenção) | por papel |
| 11.5 | `text-caption` | mata meio-pixel |
| 12 | `text-caption` | 1:1 |
| 13 | `text-body-sm` (título/leitura, default) **ou** `text-caption` (metadado denso) | por papel |
| 14 | `text-body-sm` | 1:1 |
| ≥15 | `text-body` / `text-price` / `text-h3..display` | por contexto |

**Pesos:** `font-semibold` (default ênfase), `font-bold` (título/preço), `font-medium`, `font-normal`. ⛔ `font-extrabold` (fora do DS). **Label não é tamanho** → `text-body-sm font-semibold` (sem token `text-label`).

⛔ **Proibido:** qualquer fonte <11px · meio-pixel (`text-[10.5px]`, `text-[11.5px]`) · `text-[Npx]` arbitrário.

---

## 3. Radius (D2) ✏️

Vocabulário reduzido a **3 raios**:

| Token | Valor | Classe | Uso |
|-------|-------|--------|-----|
| `--radius-xs` | 0.25rem | `rounded-xs` | detalhe fino (checkbox, item de select) |
| `--radius-sm` | 0.5rem | `rounded-sm` | **default geral** — input, card, badge, dialog, botão |
| `--radius-full` 🆕(rename) | 9999px | `rounded-full` | pills, avatares, FAB redondo |

- ⛔ `rounded-pill` (deprecado → `rounded-full`). Token `--radius-pill` renomeado para `--radius-full`.
- ⛔ `rounded-md / -lg / -xl / -2xl / -3xl` e `rounded` bare → todos `rounded-sm`. Esses tokens são **removidos do `@theme`** após a migração de classes (F4).

---

## 4. Sombras

| Token | Classe | Uso |
|-------|--------|-----|
| `--shadow-sm` | `shadow-sm` | card padrão (elevação 1) |
| `--shadow-md` | `shadow-md` | hover/card interativo |
| `--shadow-lg` | `shadow-lg` | dialog/drawer/overlay |

⛔ `shadow-xl` (fora do token) · `shadow-` (classe quebrada).

---

## 5. Espaçamento

Escala Tailwind apenas (`p-4`, `gap-3`, `mt-2`…). ⛔ valores arbitrários `p-[Npx]` salvo exceção documentada.

---

## 6. Primitivos `src/components/ui/`

Já existentes: `badge` (`soft`|`strong`), `select` (Radix), `toggle`. **A criar (F1):**

### `ui/button`
`variant`: `primary` (bg-olive-900 / hover bg-olive-700 / text-paper-50) · `secondary` (border-divider bg-paper-100) · `ghost` (text-olive-900 hover bg-paper-100) · `danger` (bg-error text-paper-50).
`size`: `sm` h-9 px-4 text-body-sm · **`md` h-11 px-6 text-cta (default, 44px)** · `lg` h-12 px-8.
Base: `inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-olive-900/30`. `disabled:opacity-60 disabled:cursor-not-allowed`. Props extra: `isLoading` (spinner + disabled), `asChild` (Radix Slot, p/ `<Button asChild><Link/></Button>`).
Nota a11y: `size="sm"` (36px) só em toolbar densa; isolado, expandir hit-area com `before:-inset-*`.

### `ui/input` (+ `TextArea`)
Base: `h-11 w-full rounded-sm border border-divider bg-paper-50 px-3 text-body-sm text-olive-900 outline-none transition placeholder:text-olive-500`.
`focus`: `ring-2 ring-olive-900/20`. `hasError` → `border-error focus:ring-error/30`. `disabled:opacity-60`.
Compatível RHF (`register()` via spread). Unifica os dois `inputClass()` divergentes hoje em `produto-form.tsx` e `coupon-form-dialog.tsx`. `Select` (Radix, controlado) segue via `Controller`. `<Field>` (label+hint+error) permanece composição de feature.

### `ui/card` (+ `CardHeader`/`CardBody`/`CardFooter`)
Base: `rounded-sm border border-divider bg-paper-50 shadow-sm`. `as`: div|article|section. `padding`: none|sm(p-3)|**md(p-5, default)**|lg(p-6). `interactive` → `transition-shadow md:hover:shadow-md`. Foto sangrada: `padding="none"` + `className="overflow-hidden"`.

### `ui/dialog` (casca sobre `@radix-ui/react-dialog`)
Cobre os **8** diálogos (ver §F2 do REFACTOR_PLAN). Exports: `Dialog`, `DialogTrigger`, `DialogClose`, `DialogOverlay`, `DialogContent` (`size` sm|md|lg, `variant` modal|drawer), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`.
Overlay `fixed inset-0 z-40 bg-olive-900/40 backdrop-blur-sm`. Content modal centralizado `rounded-sm bg-paper-50 shadow-lg` (sm max-w-sm · md max-w-lg default · lg max-w-2xl); drawer `inset-y-0 right-0 max-w-md`. Header/Footer com `border-divider`. `DialogTitle`+`DialogDescription` obrigatórios (a11y via Radix: focus trap, ESC, aria).

**Quando NÃO usar inline:** qualquer botão, input, card ou modal novo **deve** usar o primitivo. Estilo ad-hoc = reprovado no gate.

---

## 7. Acessibilidade (mínimos verificáveis)

- **Texto de leitura/interação ≥ 12px** (`text-caption`); `text-micro` (11px) só metadado. ⛔ <11px.
- **Alvos interativos ≥ 44×44px** (WCAG 2.5.5). Botão default `md` = h-11. Ícone-botão menor → hit-area `before:-inset-*`.
- **Contraste ≥ 4.5:1** (texto normal). ⛔ texto com opacidade `text-olive-700/45` e `/50` — usar cor sólida (`text-olive-700`/`text-olive-500`). Verificar com MCP `ux-audit` → `check_contrast`.
- **Foco visível** sempre (`focus-visible:ring-2`).

---

## 8. Responsividade

Mobile-first. Hoje: `md:`×137 (ok), `lg:`×9 e `2xl:`×0 (subutilizados). Em telas largas (≥1280px) usar `lg:`/`xl:` para aproveitar espaço (grids de card, `dashboard-shell`).

---

## 9. Regras de ouro (skill `new-component` + gate `ds-compliance-reviewer`)

1. **Zero hex, zero px solto.** Só token/classe nomeada.
2. **Tipografia:** só classes nomeadas (§2). Sem `text-[Npx]`, sem <11px, sem meio-pixel.
3. **Radius:** só `rounded-xs`/`rounded-sm`/`rounded-full` (§3).
4. **Cor de superfície:** `paper-50` default; branco puro só justificado (§1).
5. **Primitivo antes de inline:** botão/input/card/dialog → usar `ui/*` (§6).
6. **A11y:** ≥12px, alvo ≥44px, contraste ≥4.5:1, foco visível (§7).
7. **Sombra:** só `shadow-sm/md/lg`.

O gate `ds-compliance-reviewer` reprova qualquer PR que viole 1–7.
