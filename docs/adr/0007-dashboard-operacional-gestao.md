# ADR 0007 — Dashboard Operacional em /gestao

**Status:** Implementado
**Data:** 2026-04-22
**Autor:** `product-engineering-orchestrator` + `frontend-engineer`
**Contexto:** Passo 5 do build de gestão Veg.ana — transformar a home `/gestao` de um hub de navegação em um dashboard operacional que responde "o que precisa da minha atenção agora?" em menos de 3 segundos.

---

## 1. Contexto

A home de `/gestao` entregava um grid de 9 cards de módulos (Cardápio, Pedidos, Cupons, etc). Essa view foi adequada no Passo 1, antes de a sidebar lateral existir. Com o shell admin do Passo 9 entregando navegação estrutural via sidebar, o hub passou a:

- **Repetir a sidebar** sem acrescentar valor.
- **Não responder** às perguntas operacionais da dona ao abrir o painel.

A proprietária (dona Ana) abre o painel para **agir**, não para navegar. As perguntas reais são:

1. Tem pedido novo esperando aceite?
2. Tem algo atrasado no preparo?
3. Quanto fiz hoje?

---

## 2. Decisões

### D1 — Separação entre dashboard e hub de módulos

**Decisão:** `/gestao` passa a ser o dashboard operacional. O hub antigo de 9 cards migra para `/gestao/modulos` — mantido como fallback útil (deep link, link no rodapé da sidebar).

**Justificativa:** o hub ainda tem valor como "mapa do painel" — especialmente para novos colaboradores ou quando a dona quer saber onde está cada função. Deletar seria perda. Mover preserva sem poluir a home.

---

### D2 — Layout em 3 linhas (atenção → faturamento → produtos/pedidos)

Linha 1 — **Hero de atenção**: alertas que precisam de ação. Quando vazio, banner calmo.
Linha 2 — **Grid de 4 stats**: receita, pedidos, ticket médio, cancelados (com delta vs ontem).
Linha 3 — **Top SKUs** (2 colunas em xl) + **Feed de pedidos recentes** (1 coluna em xl).

**Justificativa:** hierarquia de urgência. O olho vai direto para alertas vermelhos/laranja. Se não há alerta, sai pela linha de faturamento. Top SKUs e feed são consultivos — não urgentes.

---

### D3 — Server Component por padrão; client components isolados por dynamic import

`page.tsx` é Server Component: calcula métricas (funções puras) em `dashboard-metrics.ts` e passa como props para `DayStatsGrid` e `TopSkusList`.

Componentes que precisam reagir ao estado ao vivo da store Zustand (`AttentionHero`, `RecentOrdersFeed`) são Client Components importados via `next/dynamic({ ssr: false })`.

**Justificativa:**

- Máximo de lógica no servidor = zero hydration cost para stats.
- `ssr: false` em componentes Zustand evita mismatch de hidratação (store é inicializada com `mockOrders` no cliente).
- Boundary explícita: o que é reativo vs o que é snapshot do momento do request.

---

### D4 — Contrato do hook `useDashboardMetrics()` (interface estável para migração)

As funções puras em `dashboard-metrics.ts` definem o contrato de dados:

```ts
// Contrato estável — não muda ao migrar para Supabase
type DayMetrics = {
  revenue: number;
  orderCount: number;
  avgTicket: number;
  cancelCount: number;
};

type SkuStat = {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
};
```

Hoje `page.tsx` chama as funções diretamente com `mockOrders`. Na migração Supabase:

1. Criar hook `useDashboardMetrics(day: Date)` que usa TanStack Query para buscar `orders` filtrados por dia.
2. `page.tsx` passa a chamar o hook ao invés das funções com mock.
3. As funções puras em `dashboard-metrics.ts` permanecem — o hook só as alimenta com dados reais.

Os componentes `DayStatsGrid` e `TopSkusList` **não mudam** — recebem os mesmos tipos.

---

### D5 — Comparação "vs ontem" via mock pré-computado

`mock-dashboard-deltas.ts` exporta `YESTERDAY_METRICS: DayMetrics` com valores fixos representativos de um dia típico.

**Justificativa:** cálculo real de "ontem" exige query separada (filtro por `date_trunc`). No período pré-Supabase, valores fixos são preferíveis a deixar os deltas vazios — a UX fica completa e o contrato de dados fica exercitado.

**Migração:** quando Supabase entrar, remover `mock-dashboard-deltas.ts` e calcular via:

```ts
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayOrders = await fetchOrdersByDay(yesterday);
const yesterdayMetrics = calcDayMetrics(yesterdayOrders, yesterday);
```

---

### D6 — Pedidos atrasados: threshold 30 min, via statusHistory

Um pedido é considerado atrasado quando:

- `status === "PREPARANDO"`
- Entrada em PREPARANDO (via `statusHistory`) há mais de 30 minutos.

**Justificativa:** 30 min é o tempo médio de preparo de uma fornada pequena. Threshold configurável por constante em `countDelayedOrders(orders, thresholdMinutes)` — pode ser ajustado sem alterar a UI.

---

### D7 — RecentOrdersFeed: navega para /gestao/pedidos?open=<id>

O clique em um item do feed navega para `/gestao/pedidos?open=<id>`. A página de pedidos pode ler o querystring para abrir o drawer correspondente automaticamente.

**Estado atual:** o comportamento de abrir o drawer via querystring é um **pre-hook** — a navegação simples já funciona, o drawer auto-open é pendência para o Passo seguinte que implementar o drawer com URL state.

---

### D8 — Brand voice nas strings visíveis

Strings ajustadas para tom afetivo-adulto conforme Brand Voice Guide v1:

- Saudação: "Bom dia, Ana." (concreto, pessoal, não corporativo)
- Subtitle: "Aqui está o resumo de hoje." (objetivo, sem pompas)
- Banner calmo: "Tudo certo por aqui. Aproveita para revisar o cardápio ou preparar o cupom da semana." (afetivo, prático, sem exclamações excessivas)
- Alertas: descritivos e diretos ("Aguardando aceite — cliente esperando.")

---

## 3. Consequências

### Positivas

- Dona abre `/gestao` e em 3 segundos sabe o que precisa fazer.
- Alertas visuais claros por hierarquia de cor (terra = urgente, warning = atenção, leaf = ok).
- Stats do dia com delta comparativo permitem avaliação de performance sem sair da tela.
- Contrato de dados estável acelera migração para Supabase (sem refactor de componentes).
- Hub de módulos preservado em `/gestao/modulos` — sem regressão funcional.

### Negativas

- `AttentionHero` e `RecentOrdersFeed` com `ssr: false` adicionam um paint extra (skeleton → conteúdo). Aceitável: são componentes secundários na hierarquia visual.
- Saudação "Bom dia, Ana." é hardcoded. Quando auth existir, trocar por nome real do usuário logado.
- Comparação "vs ontem" é mock até Supabase — pode confundir se alguém notar que os números de ontem nunca mudam. Mitigação: tooltip futuro "Dados de comparação são aproximados nesta versão."

---

## 4. Arquivos criados/modificados

### Criados

- `src/lib/dashboard-metrics.ts` — funções puras: `calcDayMetrics`, `calcTopSkus`, `countNewOrders`, `countDelayedOrders`, `countLowStockProducts`, `getRecentOrders`, `formatRelativeTime`, `formatDelta`, `isDeltaPositive`
- `src/lib/mock-dashboard-deltas.ts` — `YESTERDAY_METRICS` mock pré-computado
- `src/components/admin/dashboard/attention-hero.tsx` — hero de alertas (client)
- `src/components/admin/dashboard/day-stats-grid.tsx` — 4 stat cards (server)
- `src/components/admin/dashboard/top-skus-list.tsx` — lista de top SKUs (server)
- `src/components/admin/dashboard/recent-orders-feed.tsx` — feed de pedidos recentes (client)
- `src/app/(gestao)/gestao/modulos/page.tsx` — hub de 9 cards (migrado)

### Modificados

- `src/app/(gestao)/gestao/page.tsx` — substituído pelo dashboard operacional

---

## 5. Pendências para passos seguintes

- **Drawer auto-open via querystring** em `/gestao/pedidos?open=<id>` (pre-hook implementado no feed).
- **Saudação dinâmica** com nome real do usuário (após auth Supabase).
- **Tooltip "estimativa"** no delta "vs ontem" quando ainda for mock.
- **Link para /gestao/modulos** no rodapé da sidebar (para manter acessibilidade do hub).
- **Threshold 30 min configurável** via settings da dona (hoje é constante em código).

---

## 6. Referências

- ADR 0005 — Shell admin e AdminGate
- ADR 0006 — Zonas de entrega (padrão `next/dynamic` com `ssr: false`)
- `Marca/Brand Voice Guide.md` — tom afetivo-adulto
- `Site/Arquitetura de Informacao v1.md` — wireframe da área admin
