# ADR 0012 — Import manual dos relatórios iFood (xlsx) até a API

**Status:** Aceito
**Data:** 2026-06-01
**Autor:** site-architect + vegana-bh-lead
**Relaciona-se com:** ADR 0010 (integração API iFood — D6/F3 "Financial → relatório de canais real")

---

## 1. Contexto

A aba **Relatórios** (`/gestao/relatorios`) cruza site vs iFood (receita, lucro líquido por canal,
ganho de migração). Mas o **único** caminho de dado iFood no sistema é via API oficial — que **não
existe ainda** (ADR 0010: depende de upgrade de perfil + homologação, lead time de semanas fora do
nosso controle). Hoje, em produção, todo pedido nasce `source = 'site'` (`place-order.ts`) e **nada**
insere pedido iFood. Resultado: metade iFood do Relatórios fica **R$ 0,00** (ou pior, fake se o seed
rodar). A gestão não consegue comparar canais — exatamente o dado que justifica a estratégia de
migração.

A confeitaria **já exporta relatórios do iFood** (estão em `/Relatórios e Avaliações IFood/`):

| Relatório                                 | Granularidade            | Campos úteis                                                           |
| ----------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `relatorio-pedidos_*.xlsx`                | por pedido (UUID + data) | **TAXAS E COMISSOES** e **VALOR LIQUIDO reais**, total pago, pagamento |
| `cardápio.xlsx` → aba "Itens do cardápio" | por produto              | Nome do item · **Vendas (qtd)** · **Total vendas (R$)**                |
| `vendas.xlsx`                             | agregado                 | total/ticket, dia, hora, formas de pagamento                           |

**Limitação dura:** nenhum relatório traz _pedido COM produto_ junto. O financeiro vem sem produto;
o por-produto vem sem taxa real. São exports separados, períodos podem diferir.

---

## 2. Decisão

Construir uma **ponte manual de ingestão por upload de xlsx**, até a API (ADR 0010 F3) substituir a
fonte mantendo o mesmo destino lógico. Mãe sobe o relatório mensal → sistema parseia → grava num
**snapshot dedicado** → Relatórios funde site (`orders`) + iFood (snapshot).

### D1 — Storage: snapshot dedicado, **não** pedidos sintéticos

Os relatórios iFood são agregados/mensais por natureza. Forçá-los em `orders` criaria pedidos fake
que **corrompem** contagem de pedidos, ticket, geografia e pico (métricas que contam linhas de
`orders`). Tabelas próprias espelham o que o relatório É:

- `ifood_imports` — 1 linha por arquivo subido (`kind`, período, nome, totais, quem subiu).
- `ifood_product_sales` — por produto/período (qtd + receita); `product_id` FK pro nosso catálogo.
- `ifood_order_financials` — por pedido (`ifood_order_id` **UNIQUE** = idempotência), líquido/taxa
  reais. (Implementado em P1.)
- `ifood_product_map` — `ifood_name` → `product_id`, persiste o casamento (mês seguinte auto-casa).

Quando a API chegar (ADR 0010 D3), ela cria **pedido real** em `orders` com `source='ifood'` — o
snapshot manual continua válido pro histórico pré-integração e pode ser desativado sem migração de
dado.

### D2 — Parser xlsx server-only com `exceljs`

Parse roda **só no server** (server action) — arquivo nunca é parseado no client, lib nunca vai pro
bundle. Escolha de lib:

- **`exceljs` (escolhida):** mantida ativamente no **npm**, MIT, API `workbook.xlsx.load(buffer)`.
- **`xlsx` / SheetJS (rejeitada):** a versão no registry npm é antiga e acumulou advisories de
  prototype pollution; a atual é distribuída fora do npm (CDN próprio), o que atrapalha
  `npm ci`/lockfile reprodutível.

Trade-off: `exceljs` é mais pesada, mas como é server-only o peso não impacta o cliente.

### D3 — Idempotência por período + por pedido

- **Itens** (`ifood_product_sales`): único por (`kind`, `period_start`, `period_end`) em
  `ifood_imports`. Re-upload do mesmo período **substitui** as linhas (apaga + reinsere) — sem
  duplicar.
- **Financeiro** (`ifood_order_financials`, P1): `ifood_order_id UNIQUE` — upsert ignora pedido já
  visto, mesmo em períodos sobrepostos.

### D4 — Mapeamento nome iFood → produto, com confirmação humana

Auto-sugere via `ifood_product_map` (exato) + match aproximado por nome normalizado; a admin
confirma/ajusta no preview antes de gravar. O mapeamento confirmado é persistido → próximos meses
casam sozinhos. Nome sem produto casado entra com `product_id = null` (receita ainda conta no canal,
mas não no lucro por produto — sinalizado na UI).

### D5 — RLS admin-only

As 4 tabelas são internas de gestão. RLS: `is_admin()` pra todas as operações. Escrita via server
action autenticada como admin (`requireAdmin()`), espelhando `import-products`.

---

## 3. Fases

| Fase   | Entrega                                  | Relatório           | Estado       |
| ------ | ---------------------------------------- | ------------------- | ------------ |
| **P0** | Receita + lucro/migração **por produto** | "Itens do cardápio" | esta entrega |
| **P1** | Líquido/taxa/ticket **reais** por canal  | `relatorio-pedidos` | próxima      |
| **P2** | Pico de pedidos iFood (dia/hora)         | `vendas.xlsx`       | backlog      |

Taxa iFood em P0 usa a estimativa validada de `lib/fees.ts` (26,2%); P1 substitui pela taxa real do
relatório financeiro.

---

## 4. Consequências

### Positivas

- Relatórios passa a comparar canais com **dado real** sem depender da homologação iFood.
- Não polui as métricas de `orders`; separação limpa site vs iFood.
- Casa de mapeamento reduz trabalho manual mês a mês.
- Caminho de saída suave quando a API entrar (ADR 0010 F3).

### Custos / riscos

- Operação manual mensal (mãe sobe o arquivo) — fricção e dependência de lembrar.
- Dependência nova (`exceljs`).
- Formato do relatório iFood pode mudar → parser detecta por header (não por posição fixa) pra
  reduzir fragilidade.
- Períodos entre relatórios podem não bater exatamente (itens vs financeiro) — tratado mostrando o
  período de cada import.

---

## 5. Decisão

**Implementar a ponte manual em fases, começando por P0 (por produto).** A API iFood (ADR 0010)
segue como workstream paralelo; quando F3 entrar, substitui a fonte mantendo o snapshot como
histórico.
