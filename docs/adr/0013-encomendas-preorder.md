# ADR 0013 — Feature Encomendas (Pré-venda Agendada)

**Data:** 2026-06-01
**Status:** Aceito
**Decidido por:** Pedro Maia Berg (produto) + Product Engineering Studio (implementação)

---

## Contexto

A Vegana BH opera como delivery-only com venda diária via site. Existe demanda
recorrente por pedidos agendados para datas futuras (festas, aniversários, presentes).
Hoje isso é tratado ad-hoc via WhatsApp, sem registro formal, sem pagamento antecipado
e sem visibilidade operacional. A feature "Encomendas" formaliza esse fluxo.

---

## Decisões

### D1 — Mesma tabela `orders` com discriminador `order_type`

Alternativas consideradas:
- Tabela separada `preorders` com schema próprio.
- Mesmo schema `orders` + discriminador.

**Escolha:** discriminador `order_type text CHECK (IN ('daily','preorder'))`.

Motivação:
- Cliente, financeiro, histórico de status e relatórios ficam unificados.
- Aba de encomendas na gestão é simplesmente `WHERE order_type = 'preorder'`.
- Evita joins cruzados em relatórios de total geral.
- Código de checkout/webhook/pagamento é reaproveitado sem adaptação.
- O risco de inconsistência entre tabelas não existe.

### D2 — Mesma máquina de estado; labels adaptados na UI

Os status `NOVO|PREPARANDO|PRONTO|A_CAMINHO|ENTREGUE|CANCELADO` são reaproveitados.
Na aba de encomendas, a UI exibe labels contextuais:
- NOVO → "Paga / Nova"
- PREPARANDO → "Em produção"
- PRONTO → "Pronta"
- A_CAMINHO → "Saiu para entrega"
- ENTREGUE → "Entregue"

Cancelamento permanece no histórico (`order_status_history`), sem coluna no kanban.

### D3 — Reconhecimento financeiro só na entrega

**Regra:** venda conta quando `status = 'ENTREGUE'`.
Encomenda paga mas não entregue aparece no kanban operacional como "a reconhecer",
mas **fora** das métricas de receita/itens vendidos.

`delivered_at` é gravado por trigger quando `status` muda para `ENTREGUE`.
Derivado do histórico = consistente e auditável.

Motivação: regime de competência correto. Não infla receita com encomendas não
cumpridas. Protege a gestora de visualizar receita que ainda não foi entregue.

### D4 — Estoque ignorado para encomendas

Produtos com `available_for_preorder = true` aparecem na rota `/encomendas`
independente de `stock`. O estoque diário não conflita com a produção sob demanda.

### D5 — Configurações de encomenda em `store_settings` (singleton `default`)

Colunas adicionadas ao singleton existente:
- `preorder_min_lead_days` — antecedência mínima em dias
- `preorder_max_lead_days` — antecedência máxima em dias
- `preorder_min_value_cents` — valor mínimo do pedido
- `preorder_daily_capacity` — capacidade por dia (NULL = ilimitado)
- `preorder_hour_from` / `preorder_hour_to` — janela horária (inteiros 0–23)

Sem tabela nova — consistente com a decisão do singleton de configurações (ADR 0008).

### D6 — Checkout separado do carrinho diário

O carrinho Zustand atual gerencia pedidos diários. Encomendas passam por checkout
dedicado (`/encomendas/checkout`) que:
1. Cria order com `order_type = 'preorder'`.
2. Valida `scheduled_date` + `scheduled_hour` contra as regras de lead e capacidade.
3. Chama o mesmo fluxo AbacatePay PIX/cartão existente.
4. Não mistura items diários com encomendas.

### D7 — Relatórios: encomendas entregues no total geral

- Seção de relatório de encomendas é **separada** dos pedidos diários.
- Encomendas ENTREGUES entram na soma total geral (receita + itens).
- Encomendas não ENTREGUES nunca entram em métricas de venda.
- Top SKUs incorpora itens de encomendas entregues.

---

## Consequências

- `orders` ganha 4 colunas: `order_type`, `scheduled_date`, `scheduled_hour`, `delivered_at`.
- `products` ganha 1 coluna: `available_for_preorder`.
- `store_settings` ganha 6 colunas de configuração de encomendas.
- Trigger `tg_orders_log_status_transition` é atualizado para gravar `delivered_at` quando `ENTREGUE`.
- `orderFromRow` no mapper precisa incluir os novos campos.
- `listAllOrders` continua funcionando; funções de relatório precisam de filtro `order_type`.
- Toda a infra AbacatePay existente é reutilizada sem alteração de interface.

---

## Não decidido / futuro

- Notificação WhatsApp para encomenda confirmada (abordada em sprint posterior).
- Lembrete automático para a gestora 2 dias antes da entrega.
- Capacidade por hora (granularidade menor que por dia).
