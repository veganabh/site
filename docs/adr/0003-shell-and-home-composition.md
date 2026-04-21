# ADR 0003 — Shell + Home composition + `/loja`

**Data:** 2026-04-19
**Autor:** `site-architect` (Opus)
**Status:** **aceita** (aprovada e implementada em 2026-04-19 — 40/40 testes, build OK, 6 rotas funcionando)

---

## 1. Contexto

ADR 0002 entregou `/produtos` com cards visualmente corretos mas **sem casca** — sem header, footer, navegação nem hero. O Lead observou que os cards ficaram "soltos" sem contexto de página.

Esta ADR resolve isso. A prioridade foi reordenada: **shell e home completas primeiro**, carrinho e detalhe depois.

Decisões de nomenclatura aprovadas pelo Lead:

- **URL da loja:** `/loja` (não `/produtos`)
- **H1 da loja:** "Cardápio" (mais específico pra doceria que "Nossa loja")
- **Home (`/`):** **loja-first** — home é a entrada principal de venda, não um landing institucional

---

## 2. Escopo

### Dentro

- 3 componentes de shell: `Header`, `Footer`, `BottomNav` (mobile)
- 2 componentes novos de home: `Hero`, `CategoryChips`
- Rota `/` (home loja-first) composta com shell completo
- Rota `/loja` — catálogo focado, H1 "Cardápio", sem hero
- Rotas placeholder `/sobre` e `/conta` com "Em breve" (Brand Voice)
- Deletar `/produtos` (substituída por `/loja`)
- Atualizar `RootLayout` para incluir Header + Footer + BottomNav em todas as páginas
- Testes Vitest para `Header`, `Footer`, `BottomNav`, `Hero`, `CategoryChips`

### Fora

- Carrinho funcional (ADR 0004)
- Detalhe `/loja/[slug]` (ADR 0005)
- Busca full-text (v2+)
- Login real (ADR 0007)
- Menu hamburger mobile com drawer animado (MVP v1.1 — por ora, `BottomNav` resolve navegação mobile)

---

## 3. Decisão — estrutura de rotas

```
/              home loja-first: Hero + Categorias + Grid + Footer
/loja          catálogo: H1 Cardápio + Categorias + Grid (sem hero)
/loja/[slug]   detalhe do produto (ADR 0005)
/sobre         placeholder "Em breve"
/conta         placeholder "Em breve"
/produtos      DELETADA — não há tráfego real, não precisa redirect
```

### Por que `/` e `/loja` coexistem (não redirecionam)

- **`/`** é a entrada editorial — hero com frase afetiva + grid dos produtos. Voltado para quem chega via anúncio, IG, ou link orgânico.
- **`/loja`** é a entrada browsing — sem hero, foco em escolher o produto. Voltado para quem já sabe o que quer (recorrente, cupom de migração iFood).
- Ambas mostram o mesmo grid; a diferença é o que vem em cima.
- SEO: `/loja` carrega a keyword "loja vegana BH" naturalmente; `/` pega "doces sem lactose BH".

Sem redirect — cada rota renderiza seu próprio conteúdo, aproveitando componentes compartilhados (CategoryChips, ProductCard).

---

## 4. Decisão — Shell

### 4.1. `Header` (`src/components/layout/header.tsx`)

**Estrutura desktop** (≥768px):

```
[ Logo mono-escura ]   [ Cardápio · Sobre · Conta ]   [ 🛒 n ]
```

**Estrutura mobile** (<768px):

```
[ Logo ]                                      [ 🛒 n ]
```

Nav principal some no mobile — resolvida pelo `BottomNav`.

**Tokens:**

- Fundo `bg-paper-50` (mesmo que a page — integra)
- Altura 64px mobile / 80px desktop
- Borda inferior `border-b border-divider`
- Logo: altura 32px mobile / 40px desktop. **Mono-escura** (`#2B3210`) — usar SVG que será criado em `public/logo/vegana-dark.svg` (placeholder textual por ora, explicado na 4.1.1)
- Nav links: `text-body-sm` 500, `text-olive-900`, hover `text-olive-500`
- Carrinho: ícone `ShoppingBag` (lucide) + badge contador `bg-terra-500 text-olive-900 rounded-full`. Contador zero esconde badge.

#### 4.1.1. Logo na v1

Como a logo oficial mono-escura ainda não foi exportada como SVG, `Header` renderiza a logo como **texto estilizado** nesta ADR: `<span className="font-script text-h2 text-olive-900">Veg.ana</span>`. Substituído por SVG real quando disponível. É funcional e visualmente decente até lá.

### 4.2. `Footer` (`src/components/layout/footer.tsx`)

**Estrutura:**

```
──────────────────────────────────────────
  Sobre · Contato · Termos · Privacidade
  [IG] [WhatsApp]
  © 2026 Veg.ana · Belo Horizonte
──────────────────────────────────────────
```

**Tokens:**

- Fundo `bg-paper-100` (contraste sutil com a page)
- Padding `py-10 md:py-12`
- Links `text-body-sm` `text-olive-700` hover `text-olive-900`
- Ícones sociais 20px `color-olive-700`
- Copyright `text-caption` `text-olive-700`

### 4.3. `BottomNav` (`src/components/layout/bottom-nav.tsx`)

Mobile-only (`md:hidden`). Fixo no bottom da viewport.

```
─────────────────────────────────────
  ⌂      🍪      🛒        👤
 Home  Cardápio Carrinho  Conta
```

**Tokens:**

- Fundo `bg-paper-50`
- Borda superior `border-t border-divider`
- Padding vertical `py-2`, safe-area-inset-bottom
- Cada item: ícone 24px + label `text-caption`
- Ativo: `text-olive-900` + ícone preenchido/outlined forte
- Inativo: `text-olive-700`
- Carrinho com badge similar ao Header

**Navegação:**

- Home → `/`
- Cardápio → `/loja`
- Carrinho → `/carrinho` (ADR 0004 — por ora stub)
- Conta → `/conta` (placeholder)

---

## 5. Decisão — componentes de home

### 5.1. `Hero` (`src/components/features/hero.tsx`)

Seção editorial no topo da home. Compacta — não deve empurrar o grid abaixo da dobra em mobile.

**Estrutura:**

```
         [  Doce feito em casa.  ]   ← font-serif italic text-display / md:text-display-xl
         [  Sem lactose.  ]           ← font-serif italic text-display
         Feito à mão em BH.           ← text-body-lg text-olive-700

         · · · · · · · ·              ← pontilhado Terracota opcional (DS §7.2)
```

**Tokens:**

- Padding vertical `py-10 md:py-16`
- Alinhamento: `text-center` mobile, `text-left` desktop com max-width
- Sem CTA explícito — o grid logo abaixo é o convite natural
- Pontilhado Terracota como elemento decorativo opcional; cortado no mobile se apertar

**Copy validada pelo Brand Voice (§6.6):**

- "Doce feito em casa. Sem lactose." (headline)
- "Feito à mão em Belo Horizonte." (subtítulo)

### 5.2. `CategoryChips` (`src/components/features/category-chips.tsx`)

Scroll horizontal de pílulas de categoria. SSR-friendly — muda a URL com query string; a página filtra os produtos.

**Estrutura:**

```
[ Todos ] [ Bolos no Pote ] [ Bolos ] [ Docinhos ]
```

**Props:**

```ts
type CategoryChipsProps = {
  active?: ProductCategory | "all";
  /** Rota base onde as chips operam (/ ou /loja). */
  basePath: string;
};
```

**Comportamento:**

- Chip "Todos" → link para `basePath` sem query
- Chip de categoria → link para `basePath?cat=<slug>`
- Chip ativa: fundo `bg-olive-900` + texto `text-paper-50`
- Chip inativa: fundo `bg-paper-100` + texto `text-olive-900`, hover `bg-paper-50 border border-olive-900`

**Scroll horizontal em mobile:** `overflow-x-auto`, sem scrollbar visível. No desktop, `flex-wrap`.

**Nota:** não há chip para `edicao-especial` por enquanto (sem produtos nessa categoria no mock).

---

## 6. Decisão — composição de `/` (home)

`src/app/page.tsx` é reescrita do zero:

```
<main>
  <Hero />
  <CategoryChips basePath="/" active={categoryFromQuery} />
  <section aria-label="Cardápio">
    <ProductGrid products={filtered} />
  </section>
</main>
```

**Filtragem:** aceita `?cat=bolo-no-pote` na URL. A `page.tsx` lê `searchParams` (Next.js 16: é Promise) e passa pro `listProducts({ category })`.

**Sem carrinho ainda** — ProductCard continua com CTA `Adicionar` desabilitado (como no ADR 0002).

---

## 7. Decisão — composição de `/loja`

`src/app/loja/page.tsx`:

```
<main>
  <header>
    <h1>Cardápio</h1>
    <p>Feito à mão, sem lactose, sem ingredientes de origem animal.</p>
  </header>
  <CategoryChips basePath="/loja" active={categoryFromQuery} />
  <ProductGrid products={filtered} />
</main>
```

**Diferença vs `/`:** sem Hero. Header da página mais compacto (H1 + subtítulo). Foco em browsing.

---

## 8. Decisão — placeholders `/sobre` e `/conta`

Pages simples com mensagem "Em breve" aplicando Brand Voice. Evita 404 quando o usuário clica no nav.

**`/sobre/page.tsx`:**

```tsx
<main className="mx-auto max-w-2xl px-4 py-16 text-center">
  <h1 className="font-serif text-h1 text-olive-900 italic">Uma cozinha em Belo Horizonte.</h1>
  <p className="mt-6 text-body-lg text-olive-700">
    A história fica pronta em breve. Enquanto isso, o cardápio te espera.
  </p>
  <Link href="/loja" className="mt-8 ...">
    Ver cardápio
  </Link>
</main>
```

**`/conta/page.tsx`:**

```tsx
<main className="mx-auto max-w-2xl px-4 py-16 text-center">
  <h1 className="font-serif text-h1 text-olive-900 italic">Conta</h1>
  <p className="mt-6 text-body-lg text-olive-700">
    Login e histórico de pedido chegam com o carrinho.
  </p>
</main>
```

---

## 9. Decisão — `RootLayout` atualizado

`src/app/layout.tsx` passa a renderizar Header e Footer e BottomNav em torno de todas as pages:

```tsx
<html>
  <body className="flex min-h-full flex-col">
    <Header />
    <div className="flex-1 pb-16 md:pb-0">{children}</div>
    <Footer />
    <BottomNav />
  </body>
</html>
```

`pb-16 md:pb-0` — empurra conteúdo pra cima do `BottomNav` fixo em mobile; no desktop não precisa.

---

## 10. Decisão — migração `/produtos`

**Deletar** `src/app/produtos/` completamente. Motivos:

- Nenhum tráfego real ainda (dev local, sem deploy).
- Preserva repo limpo — sem rotas órfãs.
- URL `/produtos` nunca foi exposta ao cliente.

Se algum dia virar necessário preservar a URL, ADR separado adiciona redirect.

---

## 11. Decisão — ícones

**`lucide-react`** já está instalada (ADR 0001). Ícones usados nesta ADR:

| Lugar              | Ícone lucide                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Header carrinho    | `ShoppingBag`                                                                                      |
| BottomNav Home     | `House`                                                                                            |
| BottomNav Cardápio | `UtensilsCrossed` ou `BookOpen` (escolher: recomendação `UtensilsCrossed` — remete a cozinha/mesa) |
| BottomNav Carrinho | `ShoppingBag`                                                                                      |
| BottomNav Conta    | `CircleUser`                                                                                       |
| Footer Instagram   | `Instagram`                                                                                        |
| Footer WhatsApp    | `MessageCircle`                                                                                    |
| Hero pontilhado    | custom (não é ícone, é CSS)                                                                        |

Todos importados individualmente para manter tree-shake: `import { ShoppingBag } from "lucide-react"`.

---

## 12. Decisão — testes

Unitários simples (Vitest + Testing Library):

1. `src/components/layout/header.test.tsx`
   - Renderiza logo "Veg.ana"
   - Renderiza nav desktop (Cardápio, Sobre, Conta)
   - Renderiza botão de carrinho com `aria-label`
   - Badge escondido quando count = 0

2. `src/components/layout/footer.test.tsx`
   - Renderiza links institucionais
   - Renderiza ano corrente no copyright

3. `src/components/layout/bottom-nav.test.tsx`
   - Renderiza 4 itens
   - Marca item ativo conforme `pathname` prop
   - Badge de carrinho escondido quando count = 0

4. `src/components/features/category-chips.test.tsx`
   - Renderiza chip "Todos" + uma por categoria
   - Chip ativa tem classe visual diferente
   - Links apontam para `basePath?cat=slug`

5. `src/components/features/hero.test.tsx`
   - Renderiza headline + subtítulo
   - Headline usa Serif italic (testar classe, não visual)

Cobertura de `Header` e `BottomNav` testa o ShoppingBag + badge via lookup de texto/contador.

**Não testamos:** a `page.tsx` e `layout.tsx` — integração é validada pelo `npm run build` + inspeção visual no dev server.

---

## 13. Consequências

### Positivas

- **Tela completa visível** no primeiro `localhost:3100/` após essa ADR — cards deixam de parecer "soltos".
- Shell reutilizado em todas as páginas atuais e futuras.
- SEO-friendly: `/` e `/loja` capturam keywords diferentes naturalmente.
- Mobile com "cara de app" via BottomNav — reduz fricção na navegação, paridade com iFood.
- Estrutura preparada para ADR 0004 (carrinho) — contador no Header já existe (só liga no Zustand).

### Negativas

- Mais arquivos para manter. Compensado pela reutilização.
- Logo ainda textual — pequena dívida visual até SVG real ser exportado.
- CategoryChips SSR (muda URL) é simples mas recarrega a página a cada filtro. Para v1 é aceitável; client-side filter pode entrar na v2 se a lista crescer.

### A monitorar

- `BottomNav` fixo em navegadores iOS pode sobrepor teclado — testar com form.
- Scroll horizontal de CategoryChips em desktop pode parecer estranho — por isso usamos `flex-wrap` em desktop.

---

## 14. Alternativas consideradas

### 14.1. `/` redireciona para `/loja`

**Descartado.** Penaliza SEO (home sem conteúdo próprio) e força segundo request. A home é o ponto de conversão; tem que ter conteúdo próprio.

### 14.2. `/loja` redireciona para `/`

**Descartado.** `/loja` tem valor próprio (browsing puro, sem hero). Também é keyword SEO.

### 14.3. Sidebar lateral estilo "Site 1" (Magical Munch) em vez de Header horizontal

**Adiado para ADR futura.** Funciona bem em dashboard mas é pesado pra loja D2C. Header horizontal é mais simples e padrão.

### 14.4. Menu hamburger mobile com drawer animado

**Adiado.** `BottomNav` resolve 90% da navegação. Hamburger pra links secundários (Termos, Privacidade) entra em v1.1.

### 14.5. Sticky Header no scroll

**Adiado.** v1 tem header no topo, sem sticky. Se feedback do usuário pedir, vira ADR.

### 14.6. Filtros client-side (Zustand) em vez de URL query

**Descartado pra v1.** Query string é shareable e SEO-friendly. Zustand filter entra se busca complexa chegar (v2+).

---

## 15. Execução — passos após aprovação

Delegados ao `frontend-engineer` (orchestrado pelo `product-engineering-orchestrator`):

1. Criar `src/components/layout/header.tsx`, `footer.tsx`, `bottom-nav.tsx`
2. Criar `src/components/features/hero.tsx`, `category-chips.tsx`
3. Extrair `ProductGrid` (grid responsivo) para `src/components/features/product-grid.tsx` — hoje o grid está inline em `/produtos/page.tsx` e deve virar componente reutilizável
4. Atualizar `src/app/layout.tsx` — incluir Header/Footer/BottomNav e ajustar body
5. Reescrever `src/app/page.tsx` (home loja-first)
6. Criar `src/app/loja/page.tsx`, `loading.tsx`, `error.tsx`
7. Criar `src/app/sobre/page.tsx` + `src/app/conta/page.tsx` (placeholders)
8. Deletar `src/app/produtos/` completamente
9. Criar os 5 arquivos de teste
10. Rodar `npm run verify` — tudo verde
11. Rodar `npm run dev` e validar visualmente em `localhost:3100/`:
    - Header com logo + nav + carrinho
    - Hero com Serif Italic gigante
    - Chips de categoria scrollando em mobile
    - Grid com 5 cards conforme ADR 0002
    - Footer institucional
    - BottomNav fixo visível em mobile
    - `/loja` sem hero, com H1 "Cardápio"
    - `/sobre` e `/conta` com "Em breve"
12. Acionar `ds-compliance-reviewer` sobre todos os componentes novos
13. Fechar ADR como aceita
