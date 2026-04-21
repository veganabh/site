# ADR 0004 — Consolidação de estado e regra de cross-sell

**Status:** Aceito  
**Data:** 2026-04-19  
**Contexto:** problemas 1–5 reportados pelo proprietário (sidebar estática, carrinho dessincronizado, coluna direita inconsistente, cross-sell sem regra, dados soltos).

---

## Contexto

Auditoria de `src/` revelou cinco pontos de inconsistência:

1. `Sidebar` — matcher de `/carrinho` existe mas o item "Pedido" não destaca porque o pathname é `/carrinho` e o matcher `p.startsWith("/carrinho")` deveria funcionar. Problema real: o `ShoppingBag` icon está mapeado para `/carrinho` mas o label diz "Pedido" sem nenhum indicador visual extra por página — a sidebar parece idêntica em todas as rotas para o usuário.

2. `MOCK_COUPONS` duplicado em `checkout-steps.tsx` e `order-detail-panel.tsx` com estruturas incompatíveis. Estado de cupom aplicado vive em `useState` local — remount zera o cupom silenciosamente.

3. Coluna direita tem `xl:w-[360px]` consistente em ambos os painéis, mas o `<main>` não tem `min-w-0` explícito, permitindo que conteúdo interno força o painel a encolher em páginas com layout largo (ex: grid de produtos).

4. Cross-sell calcula o produto mais barato dentro da economia — sem faixa de escalada, sem flag de sessão, reaparece imediatamente após aceitar.

5. Preços, cupons e sugestões vivem em estado local de componente — sem fonte única da verdade.

---

## Decisões

### D1 — Sidebar: destacar item ativo por pathname (mantido) + badge de contagem

Manter `usePathname` + matchers existentes. Adicionar `badgeCount` opcional por item — o item "Pedido" exibe badge com número de itens no carrinho (via `useCartStore`). Isso dá contexto visual por página sem mudar a estrutura de navegação.

### D2 — Fonte única: `src/lib/coupons.ts` + cupom no cart-store

- Criar `src/lib/coupons.ts` com tipo `Coupon` e `COUPONS_MAP`.
- Adicionar ao `cart-store`: `appliedCoupon: string | null`, `applyCoupon(code)`, `removeCoupon()`.
- `applyCoupon` valida contra `COUPONS_MAP` e retorna `boolean` (falha silenciosa → componente mostra erro).
- `clearCart` reseta `appliedCoupon` para `null`.
- Ambos `CartSummary` e `StepResumo` leem `appliedCoupon` do store.

### D3 — Grid: `min-w-0` no `<main>` do DashboardShell

Adicionar `min-w-0` à classe do `<main>` para impedir que conteúdo interno quebre o layout de 3 colunas.

### D4 — Cross-sell: faixas, teto de preço, flag de sessão

Criar `src/lib/cross-sell.ts` com:

```
CROSS_SELL_TIERS:
  economia < R$8       → sem sugestão
  R$8  ≤ eco < R$15   → item de até R$8   (mais caro dentro do teto)
  R$15 ≤ eco < R$25   → item de até R$15
  eco ≥ R$25           → item de até R$25
```

Exportar `getCrossSellSuggestion(savings, products, cartIds, accepted): Product | null`.

Adicionar ao `cart-store`: `crossSellAccepted: boolean`, `acceptCrossSell()`.  
`acceptCrossSell` seta `crossSellAccepted = true` E chama `addItem(product)`.  
`clearCart` reseta `crossSellAccepted = false`.

### D5 — Tipos em `src/types/`

`Coupon` exportado de `src/lib/coupons.ts` (não precisa de arquivo de tipo separado — é simples).  
`CartItem` permanece em `cart-store.ts` (re-exportado para quem precisar importar o tipo sem o store inteiro).

---

## Consequências

- `checkout-steps.tsx` e `order-detail-panel.tsx` removem definições locais de cupom e estado local de `applied`.
- `CartSummary` chama `acceptCrossSell(product)` em vez de `addItem(product)` diretamente.
- `Sidebar` importa `useCartStore` para badge — passa a ser Client Component (já é, não muda).
- Sem nova biblioteca. Sem nova rota. Sem novo componente de página.
- Testes novos: `cross-sell.test.ts` (lógica de faixa), `coupons.test.ts` (validação), cart-store actions.
