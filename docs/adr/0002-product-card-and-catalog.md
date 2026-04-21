# ADR 0002 — ProductCard + página `/produtos`

**Data:** 2026-04-19
**Autor:** `site-architect` (Opus)
**Status:** **aceita** (aprovada e implementada em 2026-04-19 — 19/19 testes passando, build OK)

---

## 1. Contexto

ADR 0001 deixou o subprojeto em estado-base: Next.js 16 + Tailwind 4 + tokens do DS + fontes + utilitários. Agora construímos a **primeira fatia funcional**: página de catálogo (`/produtos`) com grid de cards de produto.

Esta ADR **não cobre**:

- Carrinho e estado persistente (ADR 0003)
- Página de detalhe `/produtos/[slug]` (ADR 0004)
- Integração Supabase real — schema e RLS (ADR 0005)
- Checkout + Pagar.me (ADR 0006+)

O escopo é propositalmente pequeno para revisar um tijolo de cada vez.

---

## 2. Escopo desta ADR

### Dentro

- Tipo canônico `Product` (fonte única de verdade).
- Fonte de dados **mock JSON** em `src/lib/mock-products.ts` — temporária, substituível sem mexer nas páginas.
- Camada de acesso em `src/server/products.ts` — abstrai mock agora, Supabase depois.
- Componente primitive `Badge` em `src/components/ui/badge.tsx`.
- Componente feature `PriceDisplay` em `src/components/features/price-display.tsx` — bolha de preço comparada.
- Componente feature `ProductCard` em `src/components/features/product-card.tsx`.
- Rota `/produtos/page.tsx` (Server Component) com grid.
- Boundaries: `loading.tsx` com skeleton, `error.tsx` com fallback Brand Voice.
- Estado do CTA `Adicionar` **desabilitado** com helper text "Carrinho em breve" (resolvido no ADR 0003).
- Teste Vitest de `ProductCard` + `PriceDisplay`.

### Fora

- Home, detalhe, carrinho, checkout, auth, favoritos, filtros avançados.
- Fotos reais no universo B — segue placeholder até sessão de foto acontecer.
- Animações sofisticadas — hover suave e foco visível, só.

---

## 3. Decisão — tipo `Product`

Definido em `src/types/product.ts`. Fonte única de verdade para qualquer consumo futuro (mock, Supabase, API, teste).

```ts
export type ProductAttribute = "sem-lactose" | "vegano" | "sem-gluten" | "sem-ovo";

export type ProductCategory = "bolo-no-pote" | "bolo" | "docinho" | "edicao-especial";

export type Product = {
  id: string;
  slug: string; // "bolo-no-pote-brigadeiro" (usa em URL futura)
  name: string; // "Bolo no Pote — Brigadeiro"
  description: string; // 2 frases curtas (Brand Voice §6.1)
  category: ProductCategory;
  gramatura_g: number; // 230
  price_site: number; // em reais (BRL)
  price_ifood: number; // em reais; se == price_site, comparador esconde
  attributes: readonly ProductAttribute[];
  photo: {
    url: string; // /images/products/<slug>-hero.jpg (placeholder por ora)
    alt: string; // alt obrigatório (AI v1 §20)
  };
  active: boolean;
};
```

Convenções:

- **Preço em `number`**, não string. Formato final fica no helper `formatBRL` já existente.
- **`attributes` é `readonly`** — imutável pela consumidora.
- **`price_ifood` sempre presente.** Se estiver desatualizado (>48h), a bolha de preço comparada esconde (ADR 0004 detalha a lógica de stale-price).

### Regra de comparação

- Mostrar bolha de preço comparada **somente se `price_ifood > price_site`**.
- Caso contrário (iFood em promoção ou igual): mostrar só o preço do site.

---

## 4. Decisão — pattern de data fetching

Camada intermediária em `src/server/products.ts` esconde a fonte de dados. Páginas consomem **sempre** essa camada — nunca tocam mock diretamente, e nunca tocarão Supabase diretamente.

```ts
// src/server/products.ts
import type { Product, ProductCategory } from "@/types/product";
import { mockProducts } from "@/lib/mock-products";

export async function listProducts(opts?: {
  category?: ProductCategory;
  onlyActive?: boolean;
}): Promise<Product[]> {
  let data = mockProducts;
  if (opts?.onlyActive ?? true) data = data.filter((p) => p.active);
  if (opts?.category) data = data.filter((p) => p.category === opts.category);
  return data;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return mockProducts.find((p) => p.slug === slug && p.active) ?? null;
}
```

Quando Supabase entrar (ADR 0005), **só o corpo dessas funções muda** — o shape de retorno permanece `Product` / `Product[]`.

---

## 5. Decisão — dados mock iniciais

`src/lib/mock-products.ts` contém os **5 SKUs do top 5 real de 3 meses** (cardapio.xlsx), mais **1 edição para referência futura**:

| slug                      | preço site | preço iFood                                   | categoria    |
| ------------------------- | ---------- | --------------------------------------------- | ------------ |
| `bolo-no-pote-brigadeiro` | 17,90      | 18,90                                         | bolo-no-pote |
| `bolo-no-pote-prestigio`  | 17,90      | 18,90                                         | bolo-no-pote |
| `bolo-cenoura-cobertura`  | 11,90      | 11,90 _(iFood desatualizado — bolha esconde)_ | bolo         |
| `palha-italiana`          | 7,00       | 8,00                                          | docinho      |
| `bombom-brigadeiro`       | 7,00       | 8,00                                          | docinho      |

Descrições aplicam **Brand Voice Guide §6.1** (nunca abre com "Delicioso"; ingrediente concreto + gramatura + atributo como fato).

O Bolo de Cenoura tem preços iguais propositalmente para testar o caso do comparador escondido.

---

## 6. Decisão — composição de componentes

### 6.1. `Badge` (primitive, `src/components/ui/badge.tsx`)

Pílula pequena usada para atributos de produto e categorias.

**Props:**

```ts
type BadgeProps = {
  variant?: "soft" | "strong";
  children: React.ReactNode;
  className?: string;
};
```

**Tokens aplicados:**

- Altura 28px (`h-7`)
- Padding horizontal `px-3`
- Radius `rounded-full`
- **`soft`**: `bg-paper-100 text-olive-900` + `text-caption font-bold`
- **`strong`**: `bg-olive-500 text-paper-50` + `text-caption font-bold`

### 6.2. `PriceDisplay` (feature, `src/components/features/price-display.tsx`)

Bolha de preço comparada do DS §9.3.

**Props:**

```ts
type PriceDisplayProps = {
  priceSite: number;
  priceIfood: number;
  showSavingsLabel?: boolean; // mostra "você economiza R$ X,XX" ou não
  className?: string;
};
```

**Comportamento:**

- Sempre mostra `priceSite` (grande).
- Mostra `priceIfood` riscado **apenas se** `priceIfood > priceSite`.
- Se `showSavingsLabel` e há economia: adiciona linha "você economiza R$ X,XX" em `color.brand.terra-deep`.

### 6.3. `ProductCard` (feature, `src/components/features/product-card.tsx`)

Conforme DS §9.2.

**Props:**

```ts
type ProductCardProps = {
  product: Product;
  onAdd?: (product: Product) => void; // ADR 0003 liga isso ao carrinho
  className?: string;
};
```

**Estrutura:**

```
┌─────────────────┐
│  [ Foto 1:1 ]   │ ← next/image, aspect-square, radius-sm, alt obrigatório
├─────────────────┤
│ [sem lactose]   │ ← badges (até 2 atributos visíveis)
│                 │
│ Nome (H3)       │ ← text-h3, font-sans 600, color-olive-900
│ Descrição       │ ← text-body-sm, color-text-secondary, line-clamp-2
│ 230g · caption  │
│                 │
│ R$ 17,90        │ ← PriceDisplay
│ no iFood 18,90  │
│                 │
│ [ Adicionar ]   │ ← CTA primário, desabilitado nesta ADR (0003 liga)
└─────────────────┘
```

Tokens DS:

- Fundo `bg-white`
- Border `border border-divider`
- `rounded-md` + `shadow-sm`
- Padding `p-4` (16px)
- Gap vertical interno `gap-3`
- Hover: `hover:shadow-md transition-shadow`

**Voz:** o nome vem do `product.name` direto; descrição idem. Ambos já foram checados pelo Brand Voice Keeper quando os mocks foram criados.

---

## 7. Decisão — rota `/produtos`

### 7.1. Arquivos

```
src/app/produtos/
├── page.tsx          Server Component — fetch + grid
├── loading.tsx       skeleton enquanto carrega
└── error.tsx         fallback Brand Voice quando erro
```

### 7.2. `page.tsx`

```tsx
import type { Metadata } from "next";
import { listProducts } from "@/server/products";
import { ProductCard } from "@/components/features/product-card";

export const metadata: Metadata = {
  title: "Cardápio — Veg.ana",
  description:
    "Doces veganos e sem lactose feitos à mão em Belo Horizonte. Bolo no pote, palha italiana, bombons.",
};

export default async function ProdutosPage() {
  const products = await listProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <header className="mb-10 md:mb-12">
        <h1 className="font-serif text-h1 text-olive-900 italic">Cardápio</h1>
        <p className="mt-3 text-body-lg text-olive-700">
          Feito à mão, sem lactose, sem ingredientes de origem animal.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="text-body text-olive-700">Nada por aqui agora. Volta daqui a pouco.</p>
      ) : (
        <section
          aria-label="Lista de produtos"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}
    </main>
  );
}
```

### 7.3. `loading.tsx`

6 skeletons em grid, cada um com `animate-pulse` + `bg-paper-100`.

### 7.4. `error.tsx`

Client Component com Brand Voice §21:

> Headline Serif italic "A internet tropeçou." + body "Dá uma atualizada ou volta daqui a pouco." + CTA "Tentar de novo".

---

## 8. Decisão — fotos dos produtos

**Estado atual:** não há fotos no universo B editorial. Sessão de foto depende da proprietária + fotógrafo (briefing está no DS §8).

**Solução provisória (para essa ADR):**

- Cada produto tem foto em `public/images/products/<slug>-hero.jpg`.
- **Para desenvolvimento:** usar fotos do `/Banco de Imagens e Vídeos/` do repo raiz que tenham clima claro + fundo neutro. Não as dark-gourmet do iFood atual.
- Quando nenhuma serve, **placeholder neutro** em `public/images/products/_placeholder.jpg`: background `color-paper-100` + ícone sutil (sem texto). Cada card aceita `photo.url` default para `/images/products/_placeholder.jpg`.

**Real:** quando a sessão de foto acontecer, substitui 1:1 em `public/images/products/`. `next/image` cuida do resto (otimização, lazy load).

---

## 9. Decisão — CTA "Adicionar" nesta ADR

**Desabilitado** até ADR 0003 (carrinho) entrar.

Visual:

- Aparece no card conforme DS §9.8 (primário)
- `disabled` prop verdadeira
- `aria-disabled="true"`
- Helper text discreto abaixo: "Carrinho em breve"

Quando ADR 0003 entrar, a prop `onAdd` passa a ser passada pela página; o botão deixa de ser disabled; o helper some. Zero mudança no card em si — troca só no nível da página.

---

## 10. Decisão — testes nesta ADR

Escopo enxuto:

1. `src/components/features/price-display.test.tsx` (Vitest + Testing Library)
   - Renderiza `R$ 17,90` quando site=17.90, ifood=18.90
   - **Não renderiza** riscado quando site=11.90, ifood=11.90 (igualdade)
   - Renderiza "você economiza R$ 1,00" quando `showSavingsLabel`

2. `src/components/features/product-card.test.tsx`
   - Renderiza nome, descrição, gramatura
   - Renderiza `alt` na foto (nunca vazio)
   - Botão `Adicionar` está disabled

3. `src/lib/format.test.ts`
   - `formatBRL(7)` → "R$ 7,00"
   - `computeSavings` cobre o cenário de `price_ifood <= price_site` (retorna 0)

Configuração Vitest: `vitest.config.ts` a criar — com `environment: "jsdom"` e `setupFiles: ["./vitest.setup.ts"]` (import de `@testing-library/jest-dom`).

---

## 11. Consequências

### Positivas

- Primeira feature funcional e testável em ~200 linhas de código.
- Camada `server/products.ts` esconde fonte — Supabase entra depois sem quebrar nada acima.
- `ProductCard` e `PriceDisplay` já reutilizáveis para detalhe, drawer de carrinho, mini-card de cross-sell.
- Testes desde o primeiro componente — tradição bem plantada.

### Negativas

- Placeholder de CTA por 1 ADR de diferença (ADR 0003) — overhead pequeno.
- Sem fotos reais ainda — catálogo visualmente pobre no dev local.
- Mock hardcoded tem que ser atualizado manualmente até Supabase — aceitável por 1–2 ADRs.

### A monitorar

- Lighthouse da `/produtos` após primeira navegação real — meta ≥ 90.
- Quando o volume de produtos mock crescer, considerar mover para `src/lib/mock-products.json` (só JSON, sem TS) e importar com `assert { type: "json" }`.

---

## 12. Alternativas consideradas

### 12.1. Tratar o card como componente único (sem `Badge` e `PriceDisplay` separados)

**Descartado.** Badge e PriceDisplay serão reusados em: detalhe de produto, drawer, mini-card de cross-sell, checkout summary. Separar agora evita duplicação depois.

### 12.2. CTA "Adicionar" redirecionando para iFood enquanto carrinho não existe

**Descartado.** O site está em dev local, sem usuários — não há conversão a capturar. Desabilitado é mais honesto e simpler.

### 12.3. Buscar produtos via rota API (`/api/products`) em vez de função server direta

**Descartado.** Server Components da `/produtos` já rodam no servidor e podem chamar função async direto — um hop HTTP a menos. Rota API só se precisarmos expor a client-side (ex: filtros sem SSR). Não é o caso agora.

### 12.4. Usar Context / Zustand para produtos

**Descartado.** Lista de produtos é dado server-side com cache natural. Context só faria sentido se houvesse estado client complexo (filtros client-only, favoritos client-only).

### 12.5. Storybook para componentes

**Descartado por ora.** Overhead alto para 3 componentes. Se a lib de componentes chegar a 15+, reavaliar.

---

## 13. O que fica para ADRs seguintes

| ADR      | Escopo                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| **0003** | Carrinho Zustand + drawer + ligação do CTA `Adicionar`                         |
| **0004** | Página `/produtos/[slug]` detalhe + integração com preço iFood stale detection |
| **0005** | Supabase schema + RLS + types gerados + migração do mock para DB               |
| **0006** | Checkout + Pagar.me sandbox + timeline do pedido                               |
| **0007** | Auth Supabase (login + guest checkout)                                         |
| **0008** | WhatsApp pós-pedido                                                            |

---

## 14. Execução — o que fazer depois da aprovação

Em ordem, delegados ao `frontend-engineer`:

1. Criar `src/types/product.ts` com `Product`, `ProductCategory`, `ProductAttribute`.
2. Criar `src/lib/mock-products.ts` com os 5 SKUs + placeholder path.
3. Criar `src/server/products.ts` com `listProducts` e `getProductBySlug`.
4. Criar `src/components/ui/badge.tsx`.
5. Criar `src/components/features/price-display.tsx`.
6. Criar `src/components/features/product-card.tsx`.
7. Colocar placeholder `public/images/products/_placeholder.jpg` (ou JPG sólido neutro) — se não houver arquivo, temporariamente gerar via CSS puro dentro do `<Image>` fallback.
8. Criar `src/app/produtos/page.tsx`, `loading.tsx`, `error.tsx`.
9. Criar `vitest.config.ts` + `vitest.setup.ts`.
10. Criar os 3 arquivos de teste.
11. Rodar `npm run verify` — tudo verde.
12. `npm run dev` — abrir `/produtos` e conferir visualmente que:
    - Fontes estão corretas (Caveat no "Veg.ana", Playfair italic no "Cardápio", Inter em tudo mais)
    - Paleta está correta (Olive-900 no texto primário, Terra-500 na economia quando aparece)
    - Badges e PriceDisplay respeitam tokens
    - CTA "Adicionar" aparece disabled com helper
13. Acionar `ds-compliance-reviewer` sobre `ProductCard`, `PriceDisplay`, `Badge`, `/produtos/page.tsx`.
14. Fechar ADR como aceita.
