# ADR 0008 — Schema Supabase como Fundação do Sprint 1

**Status:** Proposto (aguardando aprovação do Lead)
**Data:** 2026-04-23
**Autor:** `site-architect` (Opus)
**Supersede:** —
**Depende de:** ADR 0001 (deps), ADR 0005 (máquina de estado de pedidos), ADR 0006 (zonas de entrega)

---

## 1. Contexto

O Sprint 1 marca a saída do modo **100% mock** para um backend real antes do primeiro teste com cliente. Hoje toda a persistência vive em Zustand + localStorage, com dados mock em `src/lib/mock-*.ts`. O banco Supabase está provisionado e vazio.

### Forças em jogo

- **Porte do negócio:** R$ 8–10k/mês, uma operadora (mãe do Pedro). Schema não pode ter complexidade desproporcional.
- **Reversibilidade:** decisões de schema são **caras de reverter** depois que há dados reais. Prefiro ser ligeiramente over-conservador em naming/tipos do que retrabalhar em 3 meses.
- **Código existente como contrato:** os tipos em `src/types/*.ts` e os mocks em `src/lib/mock-*.ts` já refletem o pensamento de produto. O schema deve **espelhar** esses shapes, não reinventá-los. Divergência cria fricção de mapeamento.
- **Sprint 1 escopo:** produtos, pedidos, carrinho-ao-vivo, checkout AbacatePay (PIX + cartão), cupons, kits presente, zonas de entrega, admin kanban. **Fora do Sprint 1:** fidelidade ("selinhos"), PWA offline completo, WhatsApp bidirecional.
- **RLS não é opcional:** Supabase Auth + RLS é a barreira de autorização. Nada de regra de negócio no cliente pra decidir "pode ler".
- **Next.js 16 + SSR:** queries no server usam service role ou RLS-aware client. Queries no client usam anon key sob RLS.

### O que o código já decide (vou respeitar)

- `src/types/order.ts` — máquina de estado `NOVO → PREPARANDO → PRONTO → A_CAMINHO → ENTREGUE | CANCELADO`, `statusHistory` array, `paymentStatus`, `cancelReason`, `source: "site" | "ifood"`, `deliveryCallId`.
- `src/types/product.ts` — `category`, `attributes`, `contains`, `tags`, `price_site`, `price_ifood`, `gramatura_g`, `active`, `stock`, `lowStockThreshold`, `ifoodRating`, `ifoodOrderCount`.
- `src/types/coupon.ts` — `CouponType` (PERCENTUAL | FIXO | FRETE_GRATIS), `CouponStatus`, `value`, `minOrderValue`, `maxUses`, `usedCount`, `validFrom`, `validUntil`.
- `src/types/gift-kit.ts` — `GiftKitTemplate` com `slots: GiftKitSlot[]` (cada slot tem `eligibleProductIds`), `KitCartItem`, `GIFT_PACKAGING_PRICE`.
- `src/types/delivery-ring.ts` — 20 anéis concêntricos 500m cada, `innerRadiusM`, `outerRadiusM`, `fee`, `etaMin`, `etaMax`, `active`.
- `src/types/user.ts` — `UserProfile` (firstName, lastName, phone, avatarUrl) + `UserAddress[]`.

### Nota terminológica importante

No código atual, **"rings" = zonas de entrega geográficas** (anéis concêntricos por raio). O Pedro mencionou "rings (programa fidelidade tipo selinhos)" no roadmap — isso é **outra feature**, fora do Sprint 1. Para evitar colisão semântica, este ADR usa:

- **`delivery_rings`** — zonas de entrega (existe hoje).
- **`loyalty_*`** — programa de fidelidade (fora do Sprint 1, marcado em Open Questions).

---

## 2. Decisões

### D1 — `auth.users` como fonte de verdade + tabela `profiles` espelho 1:1

Usar `auth.users` do Supabase como fonte de identidade (email, senha hash, confirmação). Criar tabela `public.profiles` com `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` para perfil estendido (first_name, last_name, phone, avatar_url, cpf nullable, role).

**Por quê:**

- `auth.users` é gerenciado pelo Supabase — não dá pra adicionar colunas custom sem gambiarra.
- Padrão oficial do Supabase (docs: "User Management") e o que o ecossistema assume.
- Trigger `on_auth_user_created` popula `profiles` com um row vazio ao cadastro — o usuário nunca fica sem profile.
- `profiles.id === auth.users.id` elimina ambiguidade de "qual é meu ID?".

**Trade-off descartado:** reimplementar tabela `users` própria — perderia OAuth futuro, recovery de senha, MFA, e exigiria reinventar a roda.

### D2 — Papel admin via coluna `profiles.role`, **não** JWT custom claim (por enquanto)

`profiles.role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin'))`.

RLS verifica admin via `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.

**Por quê:**

- JWT custom claim exige deploy de Edge Function (auth hook) — complexidade desnecessária pra 1 admin (a mãe).
- Ler `profiles.role` custa 1 query indexada (PK) — caching Supabase mitiga.
- **Reversível:** migrar pra custom claim depois é trivial se virar gargalo (improvável neste porte).

**Trade-off aceito:** cada policy admin tem subquery. Em 1 admin + volume baixo, irrelevante.

### D3 — Soft-delete em `products` e `coupons`; hard-delete **proibido** em `orders`

- `products.deleted_at timestamptz` — permite "esconder" sem quebrar FK em `order_items` histórico.
- `coupons.deleted_at timestamptz` — mesmo raciocínio (`orders.coupon_id`).
- `orders` **nunca** deleta. Cancelamento é `status = 'CANCELADO'` + `cancel_reason`. Pedido é evento financeiro — auditabilidade obriga retenção.
- `gift_kit_templates.deleted_at` — idem products.
- `delivery_rings`: **hard-delete proibido**, usar `active = false`. Os 20 anéis são fixos geograficamente.
- `profiles`: **hard-delete proibido**. Se cliente pedir LGPD, usar anonimização (ver Open Questions).

### D4 — Enums: **CHECK constraint com text**, não `CREATE TYPE ... AS ENUM`

Todas as listas fechadas (order_status, payment_status, coupon_type, product_category, etc.) usam `text` com `CHECK (col IN ('A', 'B', ...))`.

**Por quê:**

- Adicionar valor a enum PG requer `ALTER TYPE` que em alguns cenários bloqueia. Remover valor é **não suportado** (só recriar tipo).
- TypeScript já tem o enum via `as const` em `src/types/*.ts` — duplicar em PG enum cria risco de drift.
- Migration de schema fica mais clara com CHECK — qualquer dev lê a constraint e entende os valores válidos.
- Performance: text indexado + CHECK é equivalente a enum pra volumes desse porte.

**Trade-off aceito:** perde um pouco de type safety do lado PG (admin pode editar row com SQL e inserir valor inválido só se bypassar CHECK — o que não acontece). Geração de types TS via `supabase gen types` detecta a CHECK e gera union.

### D5 — Dinheiro em **`integer` centavos**, não `numeric(10,2)`

Todas as colunas monetárias (`price_site_cents`, `price_ifood_cents`, `subtotal_cents`, `shipping_fee_cents`, `discount_total_cents`, `total_cents`, `coupons.value_cents`, `delivery_rings.fee_cents`) em `integer`.

**Por quê:**

- Elimina erros de arredondamento float (exemplo clássico: `0.1 + 0.2 !== 0.3`).
- Padrão de indústria em gateway de pagamento (Stripe, Mercado Pago, etc. usam centavos integer).
- Cálculos agregados (SUM, AVG, descontos %) são determinísticos.
- JS `number` é 64-bit float — suporta inteiros exatos até `2^53`. R$ 90 quadrilhões em centavos. Nunca vai estourar.

**Ressalva AbacatePay:** confirmar no momento da implementação qual é o formato numérico da API (`/payment/reference.md` do AbacatePay). Se a API expuser decimais em reais em vez de centavos integer, a **camada de adapter** (`src/server/payments/abacatepay.ts`) converte na borda mantendo **integer centavos no BD**. Schema não muda; só o mapper.

**Trade-off aceito:** UI precisa dividir por 100 pra exibir. Centralizado em `src/lib/format-currency.ts` (já existe). O custo é 1 função helper; o ganho é zero bug de centavo por 10 anos.

**Mudança de código existente:** os tipos `Product.price_site` e `Product.price_ifood` hoje são `number` assumindo reais. Ao migrar, passam a ser centavos. O formatador central absorve. Migration de mocks para seed: `price_site_cents = price_site * 100`.

### D6 — IDs: `uuid` default; `orders.order_number bigint` sequencial **adicional**

- Todas as tabelas: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Exceção `orders`:** adicionar coluna `order_number bigserial UNIQUE NOT NULL` — número humano-legível pra cozinha falar "pedido #1234 saiu".
- UUID é chave interna + URL pública (`/pedido/<uuid>` não-enumerável).
- `order_number` é label de exibição na UI admin — nunca em URL pública.

**Por quê:**

- UUID impede enumeração (/pedido/1, /pedido/2, ...) que vazaria volume da operação.
- `bigserial` resolve o problema humano sem comprometer segurança.
- UUID v4 (default) é suficiente — não precisa v7 ordenável neste porte.

### D7 — Timestamps: `timestamptz` + `created_at`/`updated_at` via trigger

- Toda tabela: `created_at timestamptz NOT NULL DEFAULT now()`.
- Tabelas mutáveis: `updated_at timestamptz NOT NULL DEFAULT now()` + trigger `moddatetime` (extension) ou função custom.
- **Não** usar `timestamp` sem timezone — ambiguidade destrutiva em reports.

**Tabelas com `updated_at` (mutam muito):** `products`, `orders`, `profiles`, `coupons`, `gift_kit_templates`, `delivery_rings`, `user_addresses`.

**Tabelas só com `created_at` (imutáveis após insert):** `order_items`, `order_status_history`, `payments`.

### D8 — Storage de imagens: Supabase Storage bucket **público** `product-photos/`

- Bucket `product-photos` público (read público, write admin-only via RLS).
- Colunas `products.photo_url`, `products.photo_alt`, `products.photo_secondary_url`, `products.photo_secondary_alt`.
- `gift_kit_templates.cover_photo_url`.
- CDN: Supabase Storage tem CDN nativa — OK pra MVP.

**Por quê:**

- Zero custo adicional, zero integração externa (Cloudinary/S3).
- RLS no bucket: `SELECT = true` (público), `INSERT/UPDATE/DELETE = admin`.
- URLs limpas, cacheáveis via `next/image`.

**Trade-off descartado:** URLs externas (Cloudinary). Adiciona conta paga, outro vendor, outro secret. Não justifica neste volume.

**Trade-off aceito:** migração pra CDN mais robusta depois é 1 migration de colunas + script de copy (reversível).

### D9 — **`payments` é tabela separada**, não colunas em `orders`

Criar `public.payments` com `id`, `order_id FK`, `provider text NOT NULL DEFAULT 'abacatepay' CHECK (provider IN ('abacatepay', 'manual'))`, `provider_charge_id`, `method text CHECK (method IN ('pix', 'credit_card'))`, `status text CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))`, `amount_cents`, `idempotency_key text UNIQUE`, `raw_payload jsonb`, `created_at`, `updated_at`.

**Por quê:**

- **Relação 1:N real:** um pedido pode ter N tentativas de pagamento (PIX expirou + cartão tentado + cartão recusado + cartão aprovado). Colunas em `orders` forçam sobrescrita e perdem histórico.
- **Webhook do AbacatePay** escreve em `payments`, não em `orders`. Separação de concerns: `orders` é "o que foi pedido", `payments` é "como foi pago".
- **`orders.payment_status`** fica como **cache agregado** do "último pagamento relevante" pra facilitar filtro no kanban (evita JOIN em toda listagem).
- **`raw_payload jsonb`** guarda o webhook inteiro — fonte de verdade pra auditoria, reconciliação, debugging.
- **`provider` com enum + `manual`:** abre porta pra pagamento fora do sistema (caso raro — transferência direta, dinheiro na entrega) sem obrigar novo gateway. Default `abacatepay` cobre 100% dos casos automáticos.
- **`idempotency_key`:** AbacatePay pode reentregar webhook. Reprocessar inserção por chave única bloqueia duplicidade. Ver ADR 0009 D4.

**Trade-off aceito:** 1 JOIN extra pra detalhar pagamento. Mas 99% das queries do kanban só leem `orders.payment_status`, então não tem JOIN.

### D10 — `carts` fica **só em localStorage** no Sprint 1 (não persiste em BD)

Carrinho ativo **não** vai pra Supabase no Sprint 1. Continua em `cart-store.ts` com `persist()`.

**Por quê:**

- Carrinho abandonado é feature de marketing (recuperar por email/WhatsApp). Não está no Sprint 1.
- Persistir carrinho em BD pré-login exige session_id de convidado, cleanup de abandonados, RLS permissiva — complexidade desnecessária antes do teste real.
- localStorage aguenta o caso de uso (mesmo device, mesmo browser, até logout).

**Quando mudar:** quando virar feature de recuperação (Sprint 3+). ADR específico.

### D11 — `order_status_history` como tabela, **não** só array JSONB em `orders`

Hoje o código tem `Order.statusHistory: Array<{ status, at }>`. **Não** persistir como `jsonb` em `orders.status_history`. Criar tabela `order_status_history (id, order_id, status, at, changed_by_profile_id, note)`.

**Por quê:**

- Queries analíticas ("tempo médio em PREPARANDO") ficam triviais com SQL puro — JSONB exige `jsonb_path_query` e pagaria caro em index.
- Auditoria: saber *quem* mudou o status (operadora? webhook?) é valioso. Col `changed_by_profile_id` nullable resolve.
- Apenas insere, nunca atualiza — tabela crescente mas barata (linha curta, ~50 bytes).
- App continua lendo via `.select('*, history:order_status_history(*)')` — TanStack Query cacheia.

**Trade-off aceito:** 1 JOIN pra montar histórico no drawer. Custo baixo; benefício analítico grande.

### D12 — Endereços: tabela `user_addresses` normalizada + `orders.shipping_address_snapshot jsonb`

- `user_addresses` — endereços salvos do perfil (`/conta/enderecos`, label "Casa").
- `orders.shipping_address_snapshot jsonb` — **snapshot imutável** do endereço no momento do pedido.

**Por quê:**

- Cliente pode mudar endereço "Casa" amanhã — o pedido de hoje precisa congelar o endereço **daquele** momento pra reimpressão e atendimento.
- Snapshot em JSONB é barato, legível e não cria FK que impede delete do endereço salvo.
- Normalizado em `user_addresses` permite lista/edit no perfil + escolha rápida no checkout.

**Gift kits — `recipient`:** mesmo padrão. `order_items.recipient_snapshot jsonb` (ou `kits_in_order.recipient_snapshot jsonb` se separar) quando o kit vai pra outro destinatário.

### D13 — Kits no schema: **2 tabelas template + kit-por-pedido**

- `gift_kit_templates` — template definido pelo admin (ativo/inativo).
- `gift_kit_slots` — slots de cada template (N por template), com `eligible_product_ids uuid[]` (PG array) — array é OK aqui, conjunto pequeno e fechado.
- No momento do pedido: kit vira um **`order_item` com `is_kit = true`** + FK `gift_kit_template_id` + `kit_picks_snapshot jsonb` (congelando escolhas) + `kit_packaging bool` + `kit_card_message text` + `kit_recipient_snapshot jsonb`.

**Por quê:**

- Reaproveita `order_items` — não cria tabela `kit_orders` paralela.
- Snapshot JSONB das picks congela a experiência do kit mesmo se template for editado depois.
- Alternativa descartada: tabela `order_kit_picks (order_item_id, slot_id, product_id)` — mais normalizada mas 3-way JOIN pra renderizar confirmação. Trade-off ruim pro volume.

### D14 — `delivery_rings` direto no Supabase + policy admin-only write

Tabela espelha `src/types/delivery-ring.ts`. 20 rows seed na primeira migration. Admin edita `fee_cents`, `eta_min`, `eta_max`, `active` via `/gestao/zonas`.

**Por quê:**

- Mock atual (`MOCK_DELIVERY_RINGS`) vira seed da tabela.
- `useRingsStore` passa de localStorage pra TanStack Query buscando essa tabela (invalidação mutation).
- RLS: `SELECT` público (cliente precisa ver fee no checkout), `UPDATE/INSERT/DELETE` só admin.

### D15 — Extensões PG

Habilitar na primeira migration:

- `pgcrypto` — `gen_random_uuid()` (deve vir do `uuid-ossp` ou `pgcrypto` — usar pgcrypto, default Supabase).
- `moddatetime` — trigger automático de `updated_at` (opcional mas padrão limpo).
- `pg_trgm` — search fuzzy em `products.name` e `products.description` se/quando busca entrar (Sprint 2+). **Habilitar já** para não esperar migration depois; índice GIN só quando precisar.

Não habilitar: `postgis` (por enquanto lookup de zona é haversine em JS client-side, barato demais pra mover pro PG).

### D16 — Índices da primeira migration

Além de PKs e UNIQUEs automáticas:

- `idx_products_category_active (category, active) WHERE deleted_at IS NULL` — listagem de catálogo.
- `idx_products_slug UNIQUE (slug) WHERE deleted_at IS NULL` — lookup por URL.
- `idx_orders_status_created (status, created_at DESC)` — kanban admin.
- `idx_orders_profile_created (profile_id, created_at DESC)` — "meus pedidos".
- `idx_orders_payment_status (payment_status)` — filtro "aguardando pagamento".
- `idx_order_items_order (order_id)` — fetch de itens do pedido.
- `idx_order_status_history_order (order_id, at)` — histórico ordenado.
- `idx_coupons_code UNIQUE (code) WHERE deleted_at IS NULL` — validação de cupom.
- `idx_payments_order (order_id, created_at DESC)` — última tentativa de pagamento.
- `idx_user_addresses_profile (profile_id) WHERE deleted_at IS NULL` — lista de endereços.

Não criar índices "por via das dúvidas". Cada índice custa write performance — adicionar quando profile mostrar.

### D17 — RLS: política por tabela

Princípios:

1. **RLS enabled em TODAS as tabelas** (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`).
2. **Leitura pública** apenas onde catálogo exige: `products` (ativos, não-deletados), `gift_kit_templates` (ativos), `gift_kit_slots`, `delivery_rings`.
3. **Cliente vê só o seu** em `orders`, `order_items`, `order_status_history`, `payments`, `user_addresses`, `profiles` próprio.
4. **Admin vê tudo** via helper function `is_admin()` que encapsula a subquery de `profiles.role`.
5. **Anon (sem login) não escreve em nada** — exceção de fluxos server-only que usam `service_role` key.

Matriz resumida:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | self + admin | trigger on signup | self (campos permitidos) + admin | admin |
| `products` | público (where active) + admin | admin | admin | admin |
| `gift_kit_templates` | público (where active) + admin | admin | admin | admin |
| `gift_kit_slots` | público + admin | admin | admin | admin |
| `delivery_rings` | público + admin | admin | admin | admin |
| `coupons` | admin (cliente valida via RPC) | admin | admin | admin |
| `user_addresses` | self + admin | self | self | self |
| `orders` | self + admin | service_role (server action) | admin (status) | **nenhum** |
| `order_items` | self (via order) + admin | service_role | **nenhum** | **nenhum** |
| `order_status_history` | self (via order) + admin | service_role + admin | **nenhum** | **nenhum** |
| `payments` | self (via order) + admin | service_role (webhook) | service_role (webhook) | **nenhum** |

**Validação de cupom pelo cliente:** não dá SELECT direto (expõe todos os cupons, inclusive expirados/internos). Criar RPC `validate_coupon(code text, cart_total_cents int)` com `SECURITY DEFINER` que retorna `{ valid, discount_cents, reason }`.

### D18 — Naming conventions (PG side)

- **Tabelas:** `snake_case`, plural (`products`, `order_items`).
- **Colunas:** `snake_case`, singular (`customer_name`, `created_at`).
- **FK:** `<entity_singular>_id` (`profile_id`, `order_id`, `product_id`).
- **Booleans:** prefixo `is_` ou adjetivo direto (`is_kit`, `active`, `freezable`).
- **Timestamps:** sufixo `_at` (`created_at`, `deleted_at`, `paid_at`).
- **JSONB snapshots:** sufixo `_snapshot` (`shipping_address_snapshot`).
- **Enums (CHECK):** UPPER_SNAKE nos valores (`NOVO`, `PREPARANDO`) — já é a convenção em `src/types/order.ts`.
- **Index:** `idx_<table>_<cols>` (`idx_orders_status_created`).
- **Uniques:** `uq_<table>_<col>` ou criado via `UNIQUE` inline.
- **Constraints:** `ck_<table>_<rule>` (`ck_orders_status_valid`).
- **Funções:** `snake_case` (`is_admin`, `validate_coupon`).
- **Triggers:** `tg_<table>_<action>` (`tg_orders_touch_updated_at`).

### D19 — Ordem das migrations

Uma migration por grupo lógico — não um megafile. Ordem pra respeitar FK:

1. `20260424000001_extensions.sql` — habilita `pgcrypto`, `moddatetime`, `pg_trgm`.
2. `20260424000002_helpers.sql` — função `is_admin()`, trigger function `moddatetime` wrapper, função `handle_new_user()`.
3. `20260424000003_profiles.sql` — tabela `profiles` + trigger on `auth.users` insert + RLS.
4. `20260424000004_products.sql` — `products` + RLS + índices.
5. `20260424000005_delivery_rings.sql` — `delivery_rings` + seed dos 20 anéis + RLS.
6. `20260424000006_gift_kits.sql` — `gift_kit_templates`, `gift_kit_slots` + RLS.
7. `20260424000007_coupons.sql` — `coupons` + RPC `validate_coupon()` + RLS.
8. `20260424000008_user_addresses.sql` — `user_addresses` + RLS.
9. `20260424000009_orders.sql` — `orders`, `order_items`, `order_status_history` + RLS + índices.
10. `20260424000010_payments.sql` — `payments` + RLS + índices.
11. `20260424000011_storage.sql` — cria bucket `product-photos` + policies.
12. `20260424000012_seed_dev.sql` — seed dos mocks pra dev (NÃO rodar em prod — proteger com `IF current_database() = ...` ou variável).

Cada migration é **idempotente quando possível** (`CREATE TABLE IF NOT EXISTS` só pra tabelas; funções e triggers usam `CREATE OR REPLACE`).

### D20 — Geração de types TypeScript

Após cada migration: `npx supabase gen types typescript --linked > src/types/db.ts`. Commit do resultado. Gate de CI: se `db.ts` diverge do schema, lint falha.

Os tipos em `src/types/*.ts` **continuam existindo** — são os tipos de domínio (com `LucideIcon`, computed fields etc.). Camada de mapeamento em `src/server/supabase/mappers.ts` converte `Database['public']['Tables']['products']['Row']` → `Product`.

**Por quê:** domínio não é schema. Schema é persistência. Mapper é a fronteira — se schema mudar, só o mapper é afetado.

---

## 3. Lista final de tabelas (Sprint 1)

| # | Tabela | Sprint 1? | Justificativa |
|---|---|---|---|
| 1 | `profiles` | Sim | Perfil estendido de `auth.users`. Nome, phone, role. |
| 2 | `user_addresses` | Sim | Endereços salvos pro checkout rápido. |
| 3 | `products` | Sim | Catálogo. |
| 4 | `delivery_rings` | Sim | Zonas de entrega por raio. Já existe em mock. |
| 5 | `gift_kit_templates` | Sim | Kits presente. |
| 6 | `gift_kit_slots` | Sim | Slots por template. |
| 7 | `coupons` | Sim | Cupons. |
| 8 | `orders` | Sim | Pedidos. |
| 9 | `order_items` | Sim | Linhas do pedido (incluindo kits). |
| 10 | `order_status_history` | Sim | Auditoria de transições. |
| 11 | `payments` | Sim | Tentativas AbacatePay. |
| — | `carts` | **Não** | Sprint 1 mantém localStorage. |
| — | `loyalty_stamps` / `loyalty_events` | **Não** | "Rings" de fidelidade — roadmap. |
| — | `whatsapp_messages` | **Não** | WhatsApp usa `profiles.phone`. Log de envio só quando feature chegar. |
| — | `neighborhoods` | **Não** | Substituído por `delivery_rings`. Bairro é só label em `user_addresses.neighborhood`. |
| — | `product_variants` | **Não** | Produtos atuais não têm variante (bolo no pote tem sabor mas é SKU separado). Adicionar se/quando "tamanho P/M/G" virar feature. |

---

## 4. Consequências

### Positivas

- **Schema espelha código:** zero fricção de mapeamento semântico. TS types e PG columns falam a mesma língua.
- **Centavos em integer:** zero bug de arredondamento financeiro por design.
- **Soft-delete onde importa, hard-delete onde não agrega:** auditoria financeira preservada, operação limpa.
- **RLS matriz explícita:** revisável, auditável, sem regra de autorização espalhada no cliente.
- **Migrations granulares:** cada fase de review é pequena, rollback cirúrgico.
- **`payments` separada:** webhook AbacatePay tem home clara, reconciliação fica trivial.
- **`order_status_history` tabela:** abre caminho pra analytics ("tempo médio de preparo") sem rework.

### Negativas / Custos aceitos

- **Dois locais de enum** (CHECK constraint no PG + `as const` no TS). Gerador de types reconcilia, mas drift manual é possível. **Mitigação:** script de lint que lê migration e compara com types.
- **Snapshot JSONB em `orders.shipping_address_snapshot`** duplica dados com `user_addresses`. Custo de storage trivial; ganho de imutabilidade fundamental.
- **`gift_kit_slots.eligible_product_ids uuid[]`** usa array PG (não tabela de junção). Não dá pra `ON DELETE` automático — se produto for soft-deletado, array pode ficar com UUID "morto". Mitigação: na query de composição do kit, filtrar por `products.active AND deleted_at IS NULL` — UI esconde produtos órfãos graciosamente.
- **Migrations extraem tudo manualmente do mock** — primeira vez é trabalhosa. Compensa na sustentação.

### A monitorar

- **Performance de RLS com `is_admin()` subquery:** em 1 admin + volume atual é irrelevante. Profile se chegar a >100 pedidos/dia.
- **Tamanho de `order_status_history`:** cresce linear com pedidos × status_changes (~5 por pedido). Em 100 pedidos/dia × 5 = 500 rows/dia = 180k/ano. Trivial.
- **Imagens no bucket público:** se alguém começar a hotlinkar, adicionar header `Referrer-Policy` + possivelmente signed URLs no futuro (reversível).
- **Se fidelidade ("rings loyalty") virar Sprint 2:** abrir ADR próprio — não forçar encaixe agora.

---

## 5. Alternativas consideradas

### 5.1. Tabela `users` própria sem `auth.users`

- **Descartado:** reinventa autenticação. Supabase Auth é o produto. Ignorar perde OAuth, MFA, reset de senha, e cria dívida de segurança imediata.

### 5.2. `numeric(10,2)` pra dinheiro

- **Descartado:** `numeric` é exato no PG mas JS joga pra `number` (float) na borda. Ganho zero, custo de round-trip +1. Centavos em integer é padrão de indústria em pagamentos.

### 5.3. PG enums (`CREATE TYPE ... AS ENUM`)

- **Descartado:** adicionar/remover valor em enum bloqueia em alguns cenários. CHECK constraint é plug-and-play. Geração de types TS pega ambos; preferência é pela reversibilidade.

### 5.4. `orders.payments jsonb` em vez de tabela

- **Descartado:** webhook do AbacatePay chega N vezes (PIX + retry + cartão). Array JSONB exige `jsonb_set` + race condition em writes concorrentes. Tabela é atomic por row.

### 5.5. `carts` persistente no BD desde Sprint 1

- **Descartado:** feature de "recuperar carrinho abandonado" é marketing (Sprint 3+). Persistir agora exige session de convidado, cleanup cron, RLS de convidado — complexidade sem payoff.

### 5.6. Neighborhoods como tabela (com fee por bairro)

- **Descartado:** modelo atual é por raio geográfico (`delivery_rings`), não por bairro. Bairro vira só label descritivo no endereço. Migrar pra bairro seria regressão do modelo de precificação vigente.

### 5.7. Role admin via JWT custom claim

- **Descartado agora:** exige Edge Function de auth hook — complexidade maior que o ganho. `profiles.role + is_admin()` é reversível trivialmente se virar gargalo.

---

## 6. Open Questions

1. **LGPD — direito ao esquecimento:** como anonimizar `profiles` sem quebrar FK de `orders`? Proposta: função `anonymize_profile(uuid)` que zera nome/phone/email e marca `is_anonymized = true`. Decidir antes de abrir cadastro público.
2. **CPF:** `profiles.cpf text NULLABLE` ou tabela `profile_documents` separada? AbacatePay exige CPF pra PIX (`payerTaxId` no payload de charge). Proposta: nullable em `profiles`, criptografado em rest via `pgsodium` se Pedro validar o esforço. Para Sprint 1, plaintext + nunca logar — **PII leakage risk**.
3. **Programa de fidelidade ("rings"):** Pedro mencionou no roadmap. Confirmar se fica Sprint 2 pra abrir ADR específico. Proposta de nome: `loyalty_stamps` + `loyalty_events`. **Fora deste ADR.**
4. **Multi-tenant futuro:** se Veg.ana virar plataforma (irmã quer abrir confeitaria?), `tenant_id` em tudo. Não é caso agora, mas se houver 1% de chance, decidir antes da primeira migration — adicionar depois é dor enorme. **Recomendação:** não fazer. Se virar multi-tenant, é outro produto.
5. **Realtime no kanban:** ADR 0005 usa BroadcastChannel temporariamente. Migração pra Supabase Realtime (subscription em `orders`) é trivial após este schema. Qual sprint? Proposta: junto do Sprint 1, trocando o BroadcastChannel pela subscription já que o schema existe.
6. **Webhook AbacatePay — idempotência:** `payments.idempotency_key` UNIQUE + reprocessamento idempotente no handler. Detalhes de HMAC e fluxo em ADR 0009.
7. **Seed de produção:** os mocks têm dados fictícios. Cadastro real dos produtos (fotos, descrições, preços) será feito pela dona no painel admin ou importado de planilha? Decidir antes da primeira go-live.

---

## 7. Resumo da matriz de decisão (trade-offs por eixo)

| Decisão | Custo impl. | Custo operac. | Custo reversão | Escolha |
|---|---|---|---|---|
| D1 `profiles` espelho | baixo | baixo | baixo | **Feito** |
| D4 CHECK vs ENUM | igual | igual | **CHECK muito < ENUM** | CHECK |
| D5 centavos integer | +1 helper | zero bugs | médio (migrar depois é dor) | **Integer** |
| D9 `payments` separada | +1 tabela | +1 JOIN eventual | alto (mesclar depois é dor) | **Separada** |
| D10 carts localStorage | zero | zero | trivial (adicionar depois) | **localStorage** |
| D11 `order_status_history` tabela | +1 tabela | +1 JOIN | médio | **Tabela** |
| D13 kits via `order_items` | médio | médio | médio | **Reaproveitar** |

Em toda decisão contestável: **preferência por baratura de reversão**.

---

## 8. Referências

- `Site/app/src/types/order.ts` — máquina de estado e shapes de Order.
- `Site/app/src/types/product.ts` — shape de Product.
- `Site/app/src/types/coupon.ts` — shape de Coupon.
- `Site/app/src/types/gift-kit.ts` — shape de Kit templates e itens.
- `Site/app/src/types/delivery-ring.ts` — shape de anéis de entrega.
- `Site/app/src/types/user.ts` — shape de perfil e endereço.
- `Site/app/src/stores/admin-orders-store.ts` — lógica de transição que o server precisa replicar.
- ADR 0005 — máquina de estado + BroadcastChannel.
- ADR 0006 — zonas de entrega.
- Supabase Docs — Row Level Security: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Docs — User Management: https://supabase.com/docs/guides/auth/managing-user-data
- AbacatePay Docs — Webhook / Charges: https://docs.abacatepay.com/
- ADR 0009 — integração AbacatePay.
