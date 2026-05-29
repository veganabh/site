# ADR 0011 — Consolidação do Design System (tipografia, radius, branco, primitivos)

**Data:** 2026-05-29
**Status:** Proposta (aguarda execução faseada — ver `REFACTOR_PLAN.md`)
**Relacionados:** `UX_AUDIT.md` (auditoria origem), `DESIGN_SYSTEM.md` (contrato canônico), ADR 0001 (dependências/estrutura).

---

## Contexto

A auditoria (`UX_AUDIT.md`) mediu, sobre `src/**/*.tsx`:

- **480 `text-[Npx]` arbitrários** vs 522 classes nomeadas (~48% bypassa a escala). Inclui 10/11/13px (que a escala nomeada não tem) e **meio-pixel** (`text-[11.5px]`×6, `text-[10.5px]`×4). O código criou um sub-sistema de px paralelo à escala do DS.
- **Radius:** 8 classes (`rounded-md`×154, `pill`×112, `full`×100, `lg`×75, `sm`×69, `2xl`×37, `xl`×30, bare×13) para **2 valores efetivos** (9999px e 0.5rem, já colapsados). `rounded-pill` e `rounded-full` exprimem a mesma intenção.
- **~50 hex de cor literais em `.tsx`** (ex.: `#fbf8ef`×13, `#de6e27`×9, `#2b3210`×9) duplicando tokens; + `#ffffff`×2 e `bg-white`×2 que **não** são `paper-50`.
- **Sombra:** `shadow-xl`×1 (fora do token) e `shadow-`×1 (classe quebrada).
- **Ausência de primitivos compartilhados** Button/Input/Card/Dialog — estilizados ad-hoc inline em dezenas de arquivos (8 diálogos Radix independentes, 2 `inputClass()` divergentes). **Esta é a causa-raiz** da divergência multi-arquivo.

Os tokens existem (`ds-tokens.css`, `@theme`) mas são amplamente contornados. Sem um ponto único de aplicação, cada ajuste de estilo é multi-arquivo e propenso a regressão.

## Decisão

**D1 — Tipografia.** Piso de **12px** + **um token novo `text-micro` (0.6875rem / 11px, lh 1.35)** reservado a metadado fino. Migração **por papel** (tabela em `DESIGN_SYSTEM.md` §2), não 1:1. Proibido <11px e meio-pixel. Sem `text-label` (label = `text-body-sm font-semibold`).

**D2 — Radius.** Vocabulário reduzido a **3**: `xs` (0.25rem, detalhe), `sm` (0.5rem, default geral), `full` (9999px, pills/avatar). `rounded-pill` **deprecado** → `rounded-full`; token `--radius-pill` renomeado `--radius-full`. `rounded-md/-lg/-xl/-2xl/-3xl` e `rounded` bare → `rounded-sm`, e os tokens redundantes são removidos do `@theme` **após** migrar as classes.

**D3 — Branco.** Default de superfície = `paper-50`. `#ffffff`/`bg-white` só com justificativa de elevação/contraste documentada inline. Whitelist: gradiente placeholder em `product-photo.tsx`.

**Primitivos.** Criar `ui/button`, `ui/input` (+`TextArea`), `ui/card`, `ui/dialog` (casca sobre Radix), consumindo tokens — tornando o consumo de tokens o **ponto único de aplicação**. Specs em `DESIGN_SYSTEM.md` §6.

Execução em 5 fases gated (`REFACTOR_PLAN.md`): F1 Fundação → F2 Adoção → F3 Tipografia → F4 Limpeza → F5 A11y/responsivo. Cada fase fecha com `typecheck/lint/test/format` + revisão `ds-compliance-reviewer`; nenhuma fase inicia sem a anterior verde.

## Consequências

**Positivas:**
- Ponto único de estilo: refator futuro de tipografia/cor/radius vira mudança de 1 arquivo (token/primitivo).
- A11y melhora: piso 11px, alvos 44px, contraste auditável.
- Vocabulário de DS menor e honesto (3 raios, escala tipográfica real).
- Skill `new-component` e gate `ds-compliance-reviewer` passam a ter um contrato concreto a verificar.

**Negativas / riscos:**
- Refator amplo: ~65 arquivos de tipografia, ~30 cards, 8 dialogs, ~50 hex.
- Risco de regressão visual onde 13px→14px (sobe) e onde `#ffffff`≠`paper-50` (muda cor). Mitigado por **migração por papel**, **auditoria caso-a-caso de branco** e **gate por fase**.
- Ordem em F4 importa: migrar classes de radius **antes** de remover tokens do `@theme` (senão quebra as classes).

## Alternativas consideradas (rejeitadas)

- **Arredondar toda tipografia para 12/14 (sem `text-micro`):** regride densidade em ~280 usos (cards/admin ficam maiores).
- **Oficializar 10/11/13 como tokens:** perpetua o sub-sistema px e mantém texto <12px (a11y fraca).
- **Adotar shadcn/ui:** contraria a decisão de stack (CLAUDE.md) de primitivos próprios sobre Radix.
- **Manter radius colapsado sem reduzir os nomes:** mantém falsa hierarquia (5 nomes, 1 valor) que confunde.
