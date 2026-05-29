# Plano de Refactor — Design System

> Execução das decisões do ADR `docs/adr/0011-consolidacao-design-system.md`, conforme contrato `DESIGN_SYSTEM.md`. Origem: `UX_AUDIT.md`.

## Regra transversal (todas as fases)
- Cada fase **fecha com os gates do CLAUDE.md**: `npm run typecheck` + `npm run lint` + `npm run test -- --run` + `npm run format:check` (todos verdes) **e** revisão do agent **`ds-compliance-reviewer`**.
- **Nenhuma fase inicia sem a anterior verde.**
- Agente de UI: **`frontend-engineer`**. Gate: **`ds-compliance-reviewer`**. Primitivos criados via skill **`new-component`**.
- Cada fase = 1 branch + 1 PR (fluxo do CLAUDE.md). Screenshots mobile(390)/desktop(1440) das rotas tocadas antes/depois.

---

## F1 — Fundação (criar primitivos) · agente: frontend-engineer

**Objetivo:** criar os 4 primitivos consumindo tokens; preparar tokens. **Nenhum consumidor migrado.**

**Cria:**
- `src/components/ui/button.tsx` (+ `button.test.tsx`)
- `src/components/ui/input.tsx` (+ `input.test.tsx`) — exporta `Input` e `TextArea`
- `src/components/ui/card.tsx` (+ `card.test.tsx`) — exporta `Card`, `CardHeader`, `CardBody`, `CardFooter`
- `src/components/ui/dialog.tsx` (+ `dialog.test.tsx`)

**Modifica:**
- `src/styles/ds-tokens.css` — adiciona `--text-micro: 0.6875rem` (+ `--text-micro--line-height: 1.35`); comenta a deprecação de `--radius-md/-lg/-xl/-2xl/-3xl` e renomeia `--radius-pill`→`--radius-full` **mantendo alias `pill` temporário** (remoção real em F4, após migrar classes).

**Specs:** ver `DESIGN_SYSTEM.md` §6.

**DoD mensurável:**
- 4 primitivos + 4 testes verdes; cada um cobre todas as variantes/tamanhos/estados da spec.
- `text-micro` resolve no build (classe `text-micro` válida).
- Os 4 arquivos `ui/*` têm **0 hex** e **0 `text-[Npx]`** (tokens-only).
- Gates verdes + `ds-compliance-reviewer` aprova.

---

## F2 — Adoção (migrar consumidores) · agente: frontend-engineer

**Objetivo:** substituir botão/input/card/dialog inline pelos primitivos. (Tipografia px e hex residuais ficam p/ F3/F4.)

**Arquivos (listas reais da auditoria):**
- **Botões:** `features/product-card.tsx`, `dashboard/product-card-photo.tsx`, `checkout/checkout-steps.tsx` (~8), `admin/dashboard/dashboard-quick-actions.tsx`, `admin/coupons/coupon-form-dialog.tsx`, `admin/kits/kit-form-dialog.tsx`, `admin/notifications/notificacao-form.tsx`, `auth/login-form.tsx`, `auth/signup-form.tsx`, `features/cardapio/produto-form.tsx`, stats-strips (`cardapio/coupons/orders/zones`), `dashboard/sidebar.tsx`, `dashboard/top-bar.tsx`.
- **Inputs:** `features/cardapio/produto-form.tsx` (remover `inputClass()` local), `admin/coupons/coupon-form-dialog.tsx` (remover `inputClass` const), `admin/kits/kit-form-dialog.tsx`, `admin/notifications/notificacao-form.tsx`, `auth/login-form.tsx`, `auth/signup-form.tsx`, `conta/profile-form.tsx`.
- **Cards (~30):** `features/product-card.tsx`, `dashboard/product-card-photo.tsx`, `admin/dashboard/day-stats-grid.tsx`, `admin/dashboard/top-skus-list.tsx`, `admin/dashboard/recent-orders-feed.tsx`, `features/order-card.tsx`, `admin/notifications/notification-metrics-cards.tsx`, stats-strips, panels.
- **Dialogs (8):** `admin/cardapio/import-csv-dialog.tsx`, `admin/coupons/coupon-delete-dialog.tsx`, `admin/coupons/coupon-form-dialog.tsx`, `admin/kits/kit-delete-dialog.tsx`, `admin/kits/kit-form-dialog.tsx`, `features/cancel-reason-dialog.tsx`, `features/order-drawer.tsx` (variant drawer), `gift/kit-delivery-gate.tsx`.

**DoD mensurável:**
- `grep "bg-olive-900"` com padrão de botão (`...text-cta`/`py-`) **fora de `ui/button.tsx`** → 0.
- `grep "inputClass"` → 0 (definição local eliminada).
- `grep "@radix-ui/react-dialog"` → importado **só** em `ui/dialog.tsx` (8/8 dialogs migrados).
- Sem regressão visual (screenshots de `product-card`, `checkout-steps`, `coupon-form-dialog`, `order-drawer`).
- Gates verdes + `ds-compliance-reviewer` aprova.

---

## F3 — Tipografia (480 `text-[Npx]` → escala) · agente: frontend-engineer

**Objetivo:** migrar todos os `text-[Npx]` para tokens nomeados pela tabela **por papel** (`DESIGN_SYSTEM.md` §2). Zero meio-pixel, zero <11px.

**Hotspots (ordem):** `gift/kit-builder.tsx` (20), `features/order-page-client.tsx` (16), `gift/kit-delivery-gate.tsx` (12), `features/rings-table.tsx` (11), `features/order-timeline.tsx` (7), `features/order-card.tsx` (6), `dashboard/product-card-photo.tsx` (4: `text-[13px]`→`text-body-sm`, `text-[11px]`/`text-[10px]`→`text-micro`), `checkout/checkout-steps.tsx`, + ~65 arquivos restantes.

**DoD mensurável:**
- `grep "text-\[" src/**/*.tsx` → **0** (exceções whitelisted e documentadas).
- `grep "text-\[10.5px\]\|text-\[11.5px\]\|text-\[9px\]\|text-\[10px\]"` → 0.
- Gates verdes + `ds-compliance-reviewer` confirma mapeamento por papel.

---

## F4 — Limpeza (hex→token, pill/full, radius, sombra) · agente: frontend-engineer

**Objetivo:** eliminar hex literais, unificar radius, corrigir sombras. **Ordem obrigatória:**

1. **Radius:** migrar classes `rounded-pill|md|lg|xl|2xl|3xl|bare|direcionais` → `rounded-sm` (e `rounded-full` onde era pill). **Depois** remover `--radius-md/-lg/-xl/-2xl/-3xl` e o alias `pill` do `@theme` (deixa `xs`/`sm`/`full`).
2. **Hex (~50):** → classe/token caso-a-caso. `#ffffff`/`bg-white` (×4) → `bg-paper-50` salvo justificativa documentada (D3). Whitelist: gradiente de `features/product-photo.tsx`.
3. **Sombra:** `shadow-xl` (×1) → `shadow-lg`; `shadow-` (×1, bug) → corrigir/remover.

**Arquivos:** transversal (todos com `rounded-*`/hex; inclui `product-card-photo.tsx` `rounded-pill`), + `src/styles/ds-tokens.css`.

**DoD mensurável:**
- `grep "rounded-pill"` → 0; `grep "rounded-\(md\|lg\|xl\|2xl\|3xl\)"` → 0.
- Hex de cor em `.tsx` → 0 fora da whitelist; `grep "bg-white\|#ffffff"` → 0 ou justificado inline.
- `grep "shadow-xl\|shadow-\""` → 0.
- `@theme` tem só `--radius-xs/-sm/-full`.
- Gates verdes + `ds-compliance-reviewer` aprova.

---

## F5 — A11y / responsivo · agente: frontend-engineer

**Objetivo:** alvos ≥44px, contraste ≥4.5:1, aproveitar telas largas.

**Ações/arquivos:**
- Alvos `h-6/h-7/w-6` → `h-11/w-11` ou hit-area `before:-inset-*` (padrão `product-card-photo`): controles de estoque em `features/cardapio/cardapio-list.tsx`, ações de linha em tabelas/feeds.
- Banir texto com opacidade `text-olive-700/45` e `/50` → cor sólida.
- Adicionar `lg:`/`xl:` onde o layout trava em `md:`: `dashboard/dashboard-shell.tsx`, grids de card.

**DoD mensurável:**
- 0 alvo interativo <44px (auditoria + MCP).
- 0 par de contraste <4.5:1 (`mcp__ux-audit__check_contrast`).
- `mcp__ux-audit__analyze_accessibility` sem violação crítica nas rotas-chave.
- `lg:`/`xl:` presentes nos layouts-chave.
- Gates verdes + `ds-compliance-reviewer` aprova.

---

## DoD global (refator concluído)
- `grep "text-\["` em `src/**/*.tsx` → **0** (exceções whitelisted, documentadas no `DESIGN_SYSTEM.md`).
- Hex de cor em `.tsx` ~50 → **0** (whitelist: `product-photo.tsx`).
- **0** botão/input/card/dialog inline — padrões só dentro de `ui/*`.
- `rounded-pill` → 0; vocabulário de radius = `xs/sm/full`.
- `shadow-xl`/`shadow-` quebrado → 0.
- **0** contraste <4.5:1; **0** alvo <44px; **0** fonte <11px ou meio-pixel.
- ADR 0011 registrado; `DESIGN_SYSTEM.md` publicado; skill `new-component` referencia os 4 primitivos.

## Verificação
- Por fase: `npm run typecheck` · `npm run lint` · `npm run test -- --run` · `npm run format:check` → zero erro; `ds-compliance-reviewer` aprova.
- A11y/visual: `npm run dev` (porta 3100) + MCP `ux-audit` (`check_contrast`, `analyze_accessibility`, `check_responsive`) nas rotas `/`, `/gestao/cardapio`, `/gestao/cupons`, `/carrinho`. Screenshots mobile(390)/desktop(1440) por rota crítica.
