# ADR 0006 — Zonas de Entrega por Raio Geográfico

**Status:** Proposto (aguardando aprovação do Lead)
**Data:** 2026-04-22
**Autor:** `site-architect` (Opus)
**Contexto:** Passo 4 do build de gestão Veg.ana — módulo `/gestao/zonas` com mapa editável de anéis concêntricos, lookup de frete por CEP via geocodagem e substituição do fallback CEP-prefix atual.

---

## 1. Contexto

O `delivery-store.ts` atual resolve frete por prefixo de CEP hardcoded (`BH_COVERED_PREFIXES`, `neighborhoodByPrefix`, `freeDeliveryPrefixes`). O modelo tem três limites duros:

- **Não é editável pela dona.** Mudar taxa exige code push.
- **Não representa a realidade geográfica.** Prefixos de CEP não cobrem distância radial uniforme: o CEP `303` (Cidade Nova) abrange pontos 1km e 9km do centro da loja no mesmo bucket.
- **Não comunica visualmente.** A dona precisa ver no mapa quais regiões estão ativas e o impacto de mudanças.

O Pedro já decidiu o modelo conceitual (anéis concêntricos a 500m, centro fixo na loja, 20 anéis = 10km) e os tipos já existem em `src/types/delivery-ring.ts` + `src/lib/mock-delivery-rings.ts`. Este ADR **formaliza decisões de implementação** que pavimentam o Passo 4 (Fase B) — não reabre o modelo.

Restrições de contexto:

- Pré-Supabase — persistência via `localStorage` com migração prevista para tabela `delivery_rings` + RLS.
- Orçamento operacional zero — a confeitaria fatura R$ 8–10k/mês. Mapa **não pode** cobrar billing (fim de Google Maps e Mapbox).
- PWA offline-friendly (CLAUDE.md §7 raiz) — mapa precisa degradar quando geocoder está fora.
- Nominatim (OSM) tem política de uso restritiva — 1 req/s e User-Agent identificável obrigatório.

---

## 2. Decisões

### D1 — Modelo de anéis concêntricos (reafirmação)

20 anéis de 500m cada, totalizando 10km a partir do centro da loja. Tipo já definido em `src/types/delivery-ring.ts`:

```ts
type DeliveryRing = {
  id: string;
  order: number; // 1..20
  innerRadiusM: number; // 0, 500, 1000, ...
  outerRadiusM: number; // 500, 1000, 1500, ...
  fee: number; // R$
  etaMin: number; // min
  etaMax: number; // min
  active: boolean;
  label: string;
};
```

**Justificativa:** 500m é granular o suficiente para refletir diferenças reais de trânsito em BH sem explodir a UI (20 linhas editáveis cabem numa tabela). Um anel por bairro seria incoerente — bairros não são círculos.

**Centro = `STORE_LOCATION` (hardcoded, não editável na UI).** Mover a produção é evento raro e exige deploy.

---

### D2 — Stack de mapa: Leaflet + react-leaflet + OpenStreetMap + Nominatim

| Camada     | Escolha                                   | Por quê                                                       |
| ---------- | ----------------------------------------- | ------------------------------------------------------------- |
| Biblioteca | `leaflet` + `react-leaflet`               | Maduro, tree-shakable em tamanho aceitável, sem token/API key |
| Tiles      | OpenStreetMap (`tile.openstreetmap.org`)  | Livre, sem billing, atribuição obrigatória apenas             |
| Geocoder   | Nominatim (`nominatim.openstreetmap.org`) | Livre, cobre BH bem, sem API key                              |
| Distância  | Haversine puro JS                         | ~15 linhas, zero dependência, precisão suficiente para 10km   |

**Rejeitados:** ver §3.

---

### D3 — SSR: client-only via `next/dynamic` com `ssr: false`

Leaflet depende de `window`, `document` e `navigator` no import — não sobrevive a RSC. A página `/gestao/zonas/page.tsx` é Server Component (segue convenção Next.js 16), mas importa `StoreMap` dinamicamente:

```tsx
// src/app/(gestao)/gestao/zonas/page.tsx
import dynamic from "next/dynamic";

const StoreMap = dynamic(() => import("@/components/features/store-map").then((m) => m.StoreMap), {
  ssr: false,
  loading: () => <div className="bg-ivory-200 h-[500px] w-full animate-pulse" />,
});
```

O arquivo `store-map.tsx` começa com `"use client"`. A tabela de anéis e o slider não dependem de `window` — são client-side (Zustand) mas sobrevivem a SSR, então ficam em `page.tsx` normalmente via Server Component → Client Component boundary.

**Justificativa:** `ssr: false` hoje é a única forma oficial de barrar Leaflet do render do servidor em Next 16 App Router. Workarounds com `typeof window` dentro do componente falham porque o import raiz do `leaflet` já tenta acessar `window`. A alternativa — lazy dynamic import dentro de `useEffect` — aumenta complexidade sem ganho.

---

### D4 — CSS do Leaflet: import local no `StoreMap`, não em `globals.css`

```ts
// src/components/features/store-map.tsx
"use client";
import "leaflet/dist/leaflet.css";
```

**Justificativa:** O CSS do Leaflet é ~15KB. `/gestao/zonas` é a única rota que o usa (possivelmente também `/gestao/configuracoes` como preview, se vier no futuro). Importar em `globals.css` penaliza home, catálogo, carrinho e checkout — páginas críticas de LCP.

Next 16 + Turbopack faz code-split do CSS importado em componente client — a penalidade fica isolada na rota de gestão.

**Trade-off:** rotas que usem mapa no futuro precisam lembrar de importar no próprio componente. Mitigação: comentário no topo do `store-map.tsx` e uma nota no CLAUDE.md do `Site/app`.

---

### D5 — Fix do ícone default: SVG inline customizado

Leaflet quebra o ícone default quando bundler move os paths (`images/marker-icon.png`, `marker-shadow.png`). A solução padrão é um dos três:

1. Copiar os PNGs para `/public/leaflet/` e sobrescrever `L.Icon.Default.mergeOptions`.
2. Importar os PNGs do `node_modules` como assets Next.js.
3. **Substituir por SVG inline como `L.DivIcon`.** ← escolhido.

```ts
// src/components/features/store-map.tsx
import L from "leaflet";

const storeIcon = L.divIcon({
  className: "vegana-store-pin",
  html: `
    <svg viewBox="0 0 24 24" width="32" height="40" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z"
            fill="var(--c-olive-900)" stroke="var(--c-ivory-50)" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="3" fill="var(--c-ivory-50)"/>
    </svg>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});
```

**Justificativa:** Zero dependência de asset externo. Usa tokens do DS via CSS var. Escalável sem blur. Não precisa de rota `/public/leaflet/`. O `divIcon` renderiza o SVG como HTML — sem fetch de imagem.

---

### D6 — Nominatim: rate limit, User-Agent, cache e fila

Política de uso do Nominatim (https://operations.osmfoundation.org/policies/nominatim/):

- Máximo **1 req/s** por IP.
- **User-Agent** identificável obrigatório — requests genéricos do tipo `axios/1.0` são bloqueados.
- Cacheable — recomendado.

Implementação em `src/lib/geocode.ts`:

```ts
// Queue singleton FIFO com min-gap 1100ms (folga de 100ms sobre política)
const MIN_GAP_MS = 1100;
const USER_AGENT = "Veg.ana-Admin/1.0 (grupoaccellera@gmail.com)";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

async function geocode(cep: string, number?: string): Promise<GeocodeResult>;
async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult>;
```

Cache em `localStorage` com chave `geocode:{cep}-{number}` (e `reverse:{lat}-{lng}` arredondado a 4 casas). Cache hit **não entra na fila**. Cache miss entra na fila e respeita o min-gap.

**User-Agent:** `Veg.ana-Admin/1.0 (grupoaccellera@gmail.com)` — identifica a aplicação e dá contato. Email já é o oficial do projeto (CLAUDE.md raiz).

**Debounce 500ms** no input CEP do `CepTester` antes de enfileirar. Isso evita enfileirar 8 requests enquanto o usuário digita `30220310`.

**Justificativa:** sem esses 4 mecanismos (User-Agent, min-gap, cache, debounce), Nominatim bloqueia o IP da Vercel ou do dev por horas. Já aconteceu em outros projetos.

---

### D7 — `rings-store` (Zustand + `persist`)

Arquivo: `src/stores/rings-store.ts`. Chave de persistência: `vegana-rings-v1`. Seed inicial: `mockDeliveryRings`.

```ts
type RingsStore = {
  rings: DeliveryRing[];
  updateRing: (id: string, patch: Partial<DeliveryRing>) => void;
  setMaxActiveRadius: (meters: number) => void;
  lookupByLatLng: (lat: number, lng: number) => DeliveryRing | null;
  resetToDefaults: () => void;
};
```

**Comportamento-chave:**

- `setMaxActiveRadius(meters)`: ativa todos os anéis com `outerRadiusM <= meters`, desativa o resto. É um atalho, não estado separado.
- `lookupByLatLng(lat, lng)`: calcula haversine até `STORE_LOCATION`, percorre `rings` ordenados por `order`, retorna o primeiro em que `distance >= innerRadiusM && distance < outerRadiusM && active === true`. Retorna `null` se nenhum cobre.
- `resetToDefaults()`: substitui `rings` pelo `mockDeliveryRings` fresh. Útil se a dona bagunçar a tabela.
- **Versionamento do `persist`:** `version: 1, migrate: (state, from) => ...`. Se o shape do `DeliveryRing` mudar no futuro, a migration reseta para defaults ao invés de crashar.

**Justificativa:** `persist` no localStorage é suficiente pré-Supabase. Migração pós-Supabase (§5) mantém a mesma API pública do store — consumers não sabem se a fonte é local ou remota.

---

### D8 — Refactor `delivery-store.ts`

Remove `BH_COVERED_PREFIXES`, `neighborhoodByPrefix`, `freeDeliveryPrefixes`, `etaByPrefix`. Nova `mockQuote`:

```ts
async function mockQuote(cep: string, number?: string): Promise<DeliveryQuote | null> {
  const geo = await geocode(cep, number);
  if (!geo) return null;

  const ring = useRingsStore.getState().lookupByLatLng(geo.lat, geo.lng);
  if (!ring)
    return {
      cep,
      neighborhood: geo.neighborhood ?? "",
      city: geo.city,
      eta: "",
      shippingFee: 0,
      covered: false,
    };

  return {
    cep,
    neighborhood: geo.neighborhood ?? "",
    city: geo.city,
    eta: `${ring.etaMin}–${ring.etaMax} min`,
    shippingFee: ring.fee,
    covered: true,
  };
}
```

**API pública do store mantida.** Os consumers `/conta/perfil` e `/carrinho` (uso atual confirmado no código) não mudam — só a implementação interna.

**Mudança de contrato sutil:** `setCep` passa a ser **async** (retorna `Promise<DeliveryQuote | null>`). Consumers precisam ajustar de `const quote = setCep(cep)` para `const quote = await setCep(cep)`. Levantado aqui para que o implementador (Fase B) lide com os call sites.

**Neighborhood vem de reverse geocode do Nominatim** (campo `address.suburb` ou `address.neighbourhood`). Se indisponível, string vazia — a UI já lida com isso hoje.

---

### D9 — Slider de raio máximo: atalho derivado

O `<MaxRadiusSlider>` lê o maior `outerRadiusM` entre anéis ativos (`derived`, calculado no render) e dispara `setMaxActiveRadius` no `onChange`. Ediçoes individuais na tabela (ativar anel 5 sozinho enquanto 1-4 estão inativos) **são permitidas** — o slider simplesmente reflete o maior ativo contíguo ou não.

**Edge case documentado:** se houver gaps (1-3 ativos, 4 inativo, 5 ativo), o slider mostra 2500m mas clicar nele normaliza. É aceitável — gaps são uso avançado e raro.

**Justificativa:** 90% das edições serão "estender/encurtar alcance". O slider resolve isso em um gesto. Edições finas continuam na tabela.

---

### D10 — Fallback offline: CEP-prefix como último recurso

Se o `geocode()` falha (network error, 429 rate limit, 5xx Nominatim), `mockQuote` cai para a lógica antiga CEP-prefix (portada para função interna `fallbackQuoteByPrefix(cep)` dentro de `delivery-store.ts`). A quote retornada marca `covered` normalmente, mas expõe um flag:

```ts
type DeliveryQuote = {
  // ... campos atuais
  estimate?: boolean; // true quando veio do fallback
};
```

UI do `CepTester` e do carrinho mostra, quando `estimate === true`:

> "Estimativa — conexão com mapa indisponível. Valor pode ajustar ao confirmar pedido."

Retenta em background 30s depois via `setTimeout` — se vier resposta real, atualiza a quote sem interrupção do usuário.

**Justificativa:** PWA offline-friendly é princípio do projeto. "Site não consegue calcular frete" é UX inaceitável, especialmente para uma confeitaria que vai educar a clientela a sair do iFood. Fallback aproximado é melhor que bloqueio.

---

### D11 — Coordenadas precisas da loja: geocodar agora, hardcodar resultado

**Decisão:** rodar `curl` contra Nominatim **uma vez** durante a Fase B (implementação), extrair lat/lng precisos e substituir no `store-location.ts`.

Comando:

```bash
curl -H "User-Agent: Veg.ana-Admin/1.0 (grupoaccellera@gmail.com)" \
  "https://nominatim.openstreetmap.org/search?street=Rua+Corinto+202&city=Belo+Horizonte&state=MG&postalcode=30220-310&country=Brazil&format=json&limit=1"
```

Resultado vai para `STORE_LOCATION.lat` / `.lng`. Remove o comentário `/** Coordenadas aproximadas */`.

**Justificativa:** anéis de 500m ficam visivelmente off se o centro errar 200m+. A aproximação atual (-19.9487, -43.9337) foi feita no olhômetro e pode estar a até ~300m da Rua Corinto 202 real. Geocodar uma vez custa 1 req e 2 minutos. Não justifica fazer em runtime.

**Alternativa rejeitada:** geocodar lazy na primeira carga de `/gestao/zonas` e persistir. Mais código, mais estado, e a coordenada não muda — é literalmente uma constante.

---

## 3. Alternativas consideradas

### Mapbox GL JS

**Rejeitado.** Billing a partir de 50k map loads/mês. O painel de gestão seria usado pela dona ~20 vezes/mês — nunca cruzaria o threshold. Mas o tester CEP na home/carrinho **não** é painel — é cliente. Se migrarmos a quote para renderizar o mapa no cliente (plano futuro do widget "mostrar cobertura"), cruzaríamos sim. Evita o risco futuro agora.

Também: exige `NEXT_PUBLIC_MAPBOX_TOKEN` exposto, o que significa configurar token allowlist por domínio em produção. Complexidade operacional desnecessária.

### Google Maps JavaScript API

**Rejeitado.** Billing compulsório (requer cartão de crédito mesmo no free tier). Geocoding: US$ 5 por 1k requests — escalaria para R$ 100–200/mês se a adoção crescer. Contradiz explicitamente o princípio "solução proporcional ao porte do negócio" do site-architect.

### MapLibre GL JS (fork OSS do Mapbox GL)

**Considerado seriamente.** Tiles OSS via MapTiler (free tier 100k/mês) ou Stadia Maps. Renderização vetorial mais bonita que Leaflet.

**Rejeitado por ora** porque:

- Curva de aprendizado maior.
- O uso é interno (/gestao/zonas) — beleza vetorial não paga o custo.
- Leaflet + OSM raster é pattern testado em dezenas de projetos brasileiros com mesmo caso de uso.

**Deixa a porta aberta:** se mais tarde o mapa virar público (home "veja se entregamos na sua região"), migramos para MapLibre. A abstração via `store-map.tsx` isola a escolha.

### ViaCEP + cálculo fixo por CEP range

**Rejeitado.** ViaCEP retorna logradouro + bairro, **não coordenadas**. Não resolve o problema central (buckets não-geográficos). Já é o modelo atual — é exatamente o que está sendo substituído.

### Haversine próprio vs. `geolib` / `turf`

**Haversine próprio escolhido.** 15 linhas. `turf` é 400KB+ e traz 50 funções não usadas. `geolib` é menor mas adiciona dependência para um cálculo trivial. Mantém bundle limpo.

---

## 4. Consequências

### Positivas

- Dona edita zonas sem deploy. Reduz bus factor.
- Modelo radial reflete realidade operacional (tempo de moto até destino).
- Sem billing. Sem API key em env. Sem risco de corte por cobrança.
- Fonte de verdade unificada: `rings-store` é consultado tanto pelo CepTester do admin quanto pelo `delivery-store` do cliente. Sem drift.
- Mapa isolado atrás de `next/dynamic({ ssr: false })` — não impacta LCP de nenhuma rota fora de gestão.
- Fallback CEP-prefix preserva UX quando Nominatim cai.
- Migração pós-Supabase é só trocar fonte do `rings-store` (TanStack Query) — interface pública do store não muda.

### Negativas

- Leaflet + OSM estéticamente é inferior a Mapbox/Google. Painel interno aceita isso; se público, revisitar.
- Nominatim **não tem SLA**. É política de fair-use. Se abusarmos (bug de loop), bloqueio temporário do IP. Mitigação: queue + cache + User-Agent + rate limit próprio.
- Cache localStorage tem limite (~5MB). 30 dias de CEPs geocodados não chegam perto, mas vale monitor em prod.
- `setCep` vira async — pequeno refactor nos consumers. Risco: esquecer um call site sem `await`. Mitigação: typecheck pega.
- Fallback CEP-prefix duplica lógica (mesma que existe hoje). A duplicação é intencional (último recurso quando rede falha), mas precisa ser mantida quando as zonas reais divergirem muito da aproximação por prefixo. Documentar no código.
- 20 linhas editáveis na tabela podem intimidar. Mitigação: slider como atalho dominante.

### Neutras

- Exige instalar dependências novas (§6).
- Exige copyright atribution do OSM no rodapé do mapa — Leaflet já coloca isso por default, não precisa de código.

---

## 5. Plano de migração pós-Supabase

Quando Supabase entrar no projeto (ADR futuro):

1. Criar tabela `delivery_rings` com todas as colunas do tipo `DeliveryRing` + `created_at`, `updated_at`, `updated_by`.
2. RLS:
   - `SELECT` público (qualquer visitante pode consultar — é público por natureza).
   - `UPDATE` / `INSERT` / `DELETE` apenas para `role === "admin"`.
3. `rings-store` vira consumidor de TanStack Query:
   - `useQuery(["rings"], () => supabase.from("delivery_rings").select("*"))`.
   - Mutations: `useMutation(updateRing)` com invalidação da query.
   - `persist` middleware removido — fonte de verdade passa a ser remota.
4. Interface pública do store (`rings`, `updateRing`, `setMaxActiveRadius`, `lookupByLatLng`, `resetToDefaults`) **mantida**. Nenhum consumer muda.
5. Cache de geocoding pode migrar para tabela `geocode_cache` ou permanecer em localStorage (TTL 30 dias é curto o suficiente para não justificar mover).
6. Auditoria: trigger Postgres em `delivery_rings` que registra toda mudança em `delivery_rings_audit` (quem, quando, o quê). Importante — edição de taxa é sensível.

---

## 6. Segurança

- `/gestao/zonas` protegida por `AdminGate` (mesmo componente do Passo 2, ADR 0005). Acesso só para `role === "admin"`.
- Mutações pós-Supabase passam por RLS — cliente não consegue bypass via cliente Supabase público.
- Nominatim User-Agent **não** contém dados da dona — só email institucional da agência.
- Cache localStorage não grava nada sensível (só CEP + lat/lng + bairro — nenhum dado pessoal vinculado a usuário).
- Request a Nominatim sai **do navegador** do admin, não do servidor Next.js — protege o IP da Vercel de rate limits compartilhados entre usuários.

---

## 7. Dependências novas

A instalar em Fase B:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

| Pacote           | Versão alvo | Tamanho gz | Por quê                     |
| ---------------- | ----------- | ---------- | --------------------------- |
| `leaflet`        | `^1.9`      | ~43KB      | Biblioteca de mapa core     |
| `react-leaflet`  | `^4.2`      | ~4KB       | Bindings React declarativos |
| `@types/leaflet` | `^1.9`      | dev        | Types TS oficiais           |

Nenhum outro. Haversine é inline (~15 linhas em `src/lib/haversine.ts`). Nominatim wrapper é `fetch` nativo.

**Nota sobre `react-leaflet` vs Next 16:** `react-leaflet` v4 requer React 18+. Projeto roda React 19 (Next 16). Compat confirmada na matrix oficial. Caso surja incompatibilidade em Fase B, fallback é consumir `leaflet` diretamente com `useEffect` — ADR complementar seria criado.

---

## 8. Arquivos impactados

### Criar (Fase B)

- `src/lib/haversine.ts` — função pura `haversineMeters(lat1, lng1, lat2, lng2)`
- `src/lib/geocode.ts` — wrapper Nominatim + cache localStorage + queue FIFO
- `src/stores/rings-store.ts` — Zustand + persist
- `src/components/features/store-map.tsx` — client-only, import CSS Leaflet local
- `src/components/features/rings-table.tsx` — tabela editável
- `src/components/features/max-radius-slider.tsx` — slider Radix
- `src/components/features/cep-tester.tsx` — input CEP + resultado do lookup
- `src/app/(gestao)/gestao/zonas/page.tsx` + `loading.tsx` + `error.tsx`

### Modificar

- `src/stores/delivery-store.ts` — remove prefix hardcode; `mockQuote` async via geocode + rings-store; adiciona `estimate?: boolean`
- `src/lib/store-location.ts` — substituir lat/lng aproximados por precisos (após geocodar uma vez)
- `src/app/(gestao)/gestao/page.tsx` — ativar card "Zonas de Entrega" (separado de Configurações)

### Não modificar em `globals.css`

CSS do Leaflet fica no `store-map.tsx` — ver D4.

---

## 9. Referências

- OpenStreetMap Tile Usage Policy — https://operations.osmfoundation.org/policies/tiles/
- Nominatim Usage Policy — https://operations.osmfoundation.org/policies/nominatim/
- Leaflet docs — https://leafletjs.com/reference.html
- react-leaflet docs — https://react-leaflet.js.org/
- Next.js 16 `next/dynamic` — `node_modules/next/dist/docs/` (`app/api-reference/functions/dynamic.mdx`)
- Haversine formula — https://en.wikipedia.org/wiki/Haversine_formula
- ADR 0001 — Dependências e estrutura inicial
- ADR 0005 — Gestão de pedidos e AdminGate
- Site/Arquitetura de Informacao v1.md § Entrega

---

## 10. Status e próximos passos

- Status: **Proposto**. Aguarda aprovação do Lead (Pedro).
- Após aprovação: Fase B implementa na ordem `haversine → geocode → rings-store → store-map → tabela → slider → tester → page.tsx → refactor delivery-store → ativar card em /gestao`.
- Antes da implementação, rodar o curl do D11 e colar o resultado em `store-location.ts` no primeiro commit da Fase B.
- Não implementar antes do OK explícito deste ADR.
