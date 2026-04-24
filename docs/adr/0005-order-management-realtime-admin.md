# ADR 0005 — Gestão de Pedidos e Real-time Admin

**Status:** Proposto (aguardando aprovação do Lead)
**Data:** 2026-04-22
**Autor:** `site-architect` (Opus)
**Contexto:** Passo 2 do build de gestão Veg.ana — kanban de pedidos em `/gestao/pedidos`, notificação de pedido novo, sync admin↔cliente via BroadcastChannel.

---

## 1. Contexto

O módulo de gestão precisa de:

- Uma interface kanban para a dona acompanhar e evoluir pedidos em tempo real.
- Sincronização leve entre a aba da dona (admin) e qualquer aba do cliente aberta no mesmo navegador (pré-Supabase Realtime).
- Notificação imediata quando um pedido novo entra (beep + notificação browser + badge visual).
- Gate de acesso: só usuário com `role === "admin"` acessa `/gestao/`.

Neste momento o banco ainda é mock — sem Supabase Realtime. O canal de comunicação precisa ser leve, funcionar offline-first, e ser substituível por Supabase Realtime sem reescrever a lógica de estado.

---

## 2. Decisões

### D1 — Máquina de estado do pedido

Já definida em `src/types/order.ts` (Passo 1). Documentada aqui para registro.

**Fluxo principal:**

```
NOVO → PREPARANDO → PRONTO → A_CAMINHO → ENTREGUE
```

**Ramo de cancelamento:**

```
NOVO | PREPARANDO | PRONTO → CANCELADO  (motivo obrigatório)
```

**Regras:**

- `A_CAMINHO` e `ENTREGUE` **não podem** ser cancelados (entregador já saiu ou pedido chegou).
- `CANCELADO` e `ENTREGUE` são terminais (`isTerminal()` retorna `true`).
- Qualquer tentativa de transição inválida é recusada por `canTransitionTo(from, to)` — a UI não exibe o botão, mas a store valida mesmo assim.
- Motivo de cancelamento (`cancelReason`) é obrigatório quando `to === "CANCELADO"`. A store rejeita a transição sem ele.

### D2 — BroadcastChannel: nome, shape e versionamento

**Nome do canal:** `vegana-orders-v1`

Versionado (`-v1`) para evitar colisão de mensagens entre deploys. Quando o schema mudar de forma incompatível, incrementar para `vegana-orders-v2` e migrar as instâncias abertas graciosamente (cada versão só fala com si mesma).

**Shape das mensagens:**

```ts
// Pedido novo chegou
type OrderNewMessage = {
  type: "order:new";
  order: Order; // snapshot completo
};

// Status de pedido mudou
type OrderStatusChangeMessage = {
  type: "order:status-change";
  orderId: string;
  prevStatus: OrderStatus;
  nextStatus: OrderStatus;
  at: string; // ISO 8601 — timestamp da transição
  cancelReason?: string; // presente quando nextStatus === "CANCELADO"
};

type OrderChannelMessage = OrderNewMessage | OrderStatusChangeMessage;
```

Discriminando por `type`, cada store pode reagir apenas às mensagens que lhe interessam sem casting inseguro.

### D3 — Stores separados: admin vs cliente

|                 | `useAdminOrdersStore`                                                                     | `useOrdersStore` (existente)                    |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Escopo          | Todos os pedidos                                                                          | Pedidos do cliente autenticado                  |
| Fonte de dados  | Mock estático + BroadcastChannel                                                          | Mock estático + BroadcastChannel                |
| Ações           | `acceptOrder`, `rejectOrder`, `markReady`, `callDelivery`, `markDelivered`, `cancelOrder` | Só leitura                                      |
| Ouve channel    | Sim                                                                                       | Sim (atualiza status dos seus próprios pedidos) |
| Publica channel | Sim                                                                                       | Não                                             |

Razão da separação: escopos diferentes implicam shapes diferentes, actions diferentes e lógica de permissão diferente. Misturar os dois num store único criaria condicionais de `role` espalhadas pela lógica de negócio.

**Localização:** `src/stores/admin-orders-store.ts`

### D4 — Motoqueiros fake (mock pré-integração)

**Localização:** `src/lib/mock-delivery-persons.ts`

Pool fixo de 5 motoqueiros com `{ id, name, phone, plate, avatarUrl? }`. Ao chamar `callDelivery(orderId)` na store admin, sorteio aleatório (`Math.floor(Math.random() * pool.length)`). O resultado preenche `order.deliveryCallId` com o `id` do motoqueiro sorteado.

Quando a integração real (WhatsApp Cloud API) chegar, `callDelivery` substitui o sorteio por uma Server Action que dispara o webhook — o contrato da store não muda.

### D5 — Timer "X min preparando"

Derivado em runtime, nunca persistido no pedido.

**Implementação:**

- `OrderCard` tem um `useEffect` que calcula `Math.floor((Date.now() - new Date(statusEntryAt).getTime()) / 60_000)` onde `statusEntryAt` é `order.statusHistory[currentStatusIndex].at`.
- Intervalo de atualização: **30 segundos** (não 1 segundo — granularidade de minuto, não vale custo de re-render a cada segundo).
- `statusHistory` é um array de `{ status: OrderStatus; at: string }` adicionado ao tipo `Order` (ver consequências).
- O timer só exibe para status `PREPARANDO`. Em outros status, o componente mostra o tempo total desde `createdAt` (informativo, sem urgência visual).

### D6 — Notificação de pedido novo: hook `useNewOrderNotification`

**Localização:** `src/hooks/use-new-order-notification.ts`

O hook ouve o `BroadcastChannel` e, para cada mensagem `order:new`, dispara as três notificações em paralelo:

**a) Beep (Audio HTML5)**

```ts
const audio = new Audio("/sounds/new-order.mp3");
audio.volume = 0.6;
audio.play().catch(() => {
  /* autoplay bloqueado — silencioso */
});
```

Arquivo: `public/sounds/new-order.mp3` — stub de caminho (arquivo a ser fornecido pelo time de marca ou substituído por beep gerado via `AudioContext`). Se o arquivo não existir em dev, o erro é silenciado — não quebra o fluxo.

O hook expõe `{ soundEnabled, toggleSound }` — estado persistido em `localStorage` com chave `vegana.admin-sound`. A página exibe botão para ligar/desligar.

**b) Notificação browser (Notification API)**

- Permissão solicitada **lazily** quando `(gestao)/pedidos/page.tsx` monta pela primeira vez — nunca em outro lugar.
- Verificação: `"Notification" in window && Notification.permission !== "denied"`.
- Se permissão ainda for `"default"`, chamar `Notification.requestPermission()`.
- Após permissão concedida, criar `new Notification("Novo pedido!", { body: "...", icon: "/icons/logo-192.png" })`.
- Se permissão for `"denied"`, o hook não tenta de novo — respeita a decisão do browser.

**c) Badge visual + document.title**

- `useAdminOrdersStore` expõe `newOrderCount: number` — incrementado a cada `order:new`, zerado quando a dona abre o drawer do pedido (ação `acknowledgeOrder(orderId)`).
- Componente `OrderCard` exibe badge vermelho com `newOrderCount` se `> 0`.
- `useEffect` na página `/gestao/pedidos` atualiza `document.title`:
  - `newOrderCount > 0` → `"(N) Veg.ana Admin"` onde N é o número
  - `newOrderCount === 0` → `"Veg.ana Admin"`

### D7 — Gate de acesso admin

**Camada 1 — Layout server:**

`src/app/(gestao)/layout.tsx` lê a sessão via `useSession()` (hook de sessão real quando Supabase Auth estiver integrado; hoje lê `useDevSessionStore`). Se `!session || session.user.role !== "admin"`, redireciona para `/` com `redirect("/")` do Next.js.

**Camada 2 — `useDevSessionStore`:**

Adicionar `role: "admin" | "customer"` ao tipo `MockSessionUser` e ao `INITIAL_USER` do mock. Valor padrão: `"customer"`. Para testar a área admin em dev, a dona troca via `DevToolbar` (componente de dev já existente ou a criar).

**Nota de segurança:** em produção, o gate real será middleware Next.js (`middleware.ts`) verificando JWT do Supabase — o `layout.tsx` será uma segunda barreira. O `useDevSessionStore` some quando Auth real entrar.

### D8 — Adição de `statusHistory` ao tipo `Order`

Para suportar o timer do D5 sem lógica de diff de datas frágil, o tipo `Order` ganha:

```ts
statusHistory: Array<{ status: OrderStatus; at: string }>;
```

Populado pelo mock: ao criar um pedido mock, `statusHistory` começa com `[{ status: "NOVO", at: createdAt }]`. Cada transição de status pela store admin append um novo entry.

---

## 3. Componentes e arquivos a criar

| Arquivo                                            | Responsabilidade                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/stores/admin-orders-store.ts`                 | Zustand store com todos os pedidos + ações admin + BroadcastChannel publisher |
| `src/hooks/use-new-order-notification.ts`          | Beep + Notification API + badge — escuta channel                              |
| `src/lib/mock-delivery-persons.ts`                 | Pool de 5 motoqueiros fake                                                    |
| `src/app/(gestao)/layout.tsx`                      | Gate de role admin + shell da área                                            |
| `src/app/(gestao)/gestao/pedidos/page.tsx`         | Kanban 5 colunas + filtro + busca + botão som                                 |
| `src/components/features/order-drawer.tsx`         | Drawer lateral com detalhe + ações                                            |
| `src/components/features/cancel-reason-dialog.tsx` | Dialog Radix para motivo de cancelamento                                      |
| `src/components/features/order-card.tsx`           | Card kanban com timer + badge                                                 |
| `public/sounds/new-order.mp3`                      | Stub — arquivo de áudio a fornecer                                            |

Arquivos a modificar:

| Arquivo                           | Mudança                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `src/types/order.ts`              | Adicionar `statusHistory` ao tipo `Order`                   |
| `src/stores/dev-session-store.ts` | Adicionar `role: "admin" \| "customer"` a `MockSessionUser` |

---

## 4. Consequências

### Positivas

- BroadcastChannel é nativo do browser — zero deps adicionadas.
- Contrato da store (`callDelivery`, etc.) não muda quando WhatsApp real entrar — apenas a implementação interna.
- `statusHistory` abre caminho para métricas futuras (tempo médio em cada status, SLA de preparo).
- Notificação lazy (pede permissão só quando página monta) respeita boas práticas UX — nunca pedido na home.
- Timer derivado de dado existente — não cria estado derivado que pode ficar fora de sincronia.

### Negativas

- BroadcastChannel só funciona em abas da **mesma origem no mesmo dispositivo**. Quando Supabase Realtime entrar, o channel vira wrapper sobre ele — mas essa migração é uma reescrita da camada de subscription, não dos componentes.
- `statusHistory` aumenta o tamanho do objeto `Order` em memória. Aceitável no mock; em produção, vai para coluna JSONB no Supabase (já previsto no schema).
- Notification API requer HTTPS em produção. Em `localhost:3100` funciona sem HTTPS (exceção do browser para localhost).

### A monitorar

- Quando Supabase Auth entrar: substituir gate do `layout.tsx` por middleware real + remover `useDevSessionStore`.
- Quando WhatsApp entrar: substituir `callDelivery` mock por Server Action.
- Quando Supabase Realtime entrar: substituir BroadcastChannel por subscription Supabase (interface idêntica, implementação diferente).

---

## 5. Alternativas consideradas

### 5.1. Supabase Realtime direto (sem BroadcastChannel)

- **Vantagem:** funciona entre dispositivos diferentes (dona no celular, pedido feito no browser do cliente).
- **Descartado agora:** Supabase Auth/schema ainda não está integrado. Implementar Realtime antes do schema seria construir em cima de fundação instável. BroadcastChannel é substituto adequado para a fase mock.

### 5.2. WebSocket próprio / SSE

- **Descartado:** complexidade de infraestrutura desnecessária para o MVP. BroadcastChannel resolve o caso de uso (mesma origem, mesmo device) com zero infra.

### 5.3. Store única admin+cliente com flag `viewMode`

- **Descartado:** escopos diferentes implicam shapes diferentes e ações diferentes. Uma flag `viewMode` cria condicionais de permissão espalhadas pela lógica de negócio — violação de SRP.

### 5.4. Polling periódico (setInterval com fetch)

- **Descartado:** sem API de pedidos real ainda. E mesmo quando tiver, BroadcastChannel + Supabase Realtime são soluções push, que eliminam polling desnecessário.

---

## 6. Referências

- `src/types/order.ts` — máquina de estado (Passo 1)
- `Site/Arquitetura de Informacao v1.md` — schema de pedidos, spec do painel admin
- `Marca/Design System v1.md` — tokens para o kanban
- ADR 0001 — dependências (Radix, Zustand já instalados)
- MDN BroadcastChannel API — https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
- MDN Notification API — https://developer.mozilla.org/en-US/docs/Web/API/Notification
