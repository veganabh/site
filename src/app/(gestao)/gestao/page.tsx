/**
 * /gestao — Dashboard operacional.
 *
 * Responde às três perguntas da dona em menos de 3 segundos:
 * 1. O que precisa da minha atenção agora?
 * 2. Como tá indo o dia?
 * 3. O que tá saindo mais?
 *
 * Estrutura:
 * - AttentionHero (client, reativo via Zustand)
 * - DayStatsGrid (server, mock + métricas puras)
 * - TopSkusList + RecentOrdersFeed (lado a lado em xl)
 *
 * Hub de acesso aos módulos foi movido para /gestao/modulos.
 */

import type { Metadata } from "next";
import { calcDayMetrics, calcTopSkus, greetingFor } from "@/lib/dashboard-metrics";
import { listAllOrders } from "@/server/orders";
import { listProducts } from "@/server/products";
import { DayStatsGrid } from "@/components/admin/dashboard/day-stats-grid";
import { TopSkusList, type ProductThumb } from "@/components/admin/dashboard/top-skus-list";
// Seções client reativas (Zustand) — import direto; Next 16 hidrata OK porque
// cada arquivo declara "use client". `dynamic({ssr:false})` não é permitido
// em Server Components nesta versão.
import { AttentionHero } from "@/components/admin/dashboard/attention-hero";
import { RecentOrdersFeed } from "@/components/admin/dashboard/recent-orders-feed";

export const metadata: Metadata = {
  title: "Dashboard — Gestão Veg.ana",
  description: "Visão operacional do dia — pedidos, faturamento e produtos em destaque.",
};

export default async function GestaoPage() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [orders, products] = await Promise.all([
    listAllOrders(),
    listProducts({ onlyActive: false }),
  ]);
  const todayMetrics = calcDayMetrics(orders, today);
  const yesterdayMetrics = calcDayMetrics(orders, yesterday);
  const topSkus = calcTopSkus(orders, today, 5);
  const greeting = greetingFor(today);

  // Pós-migração orders: `item.productId` é UUID real → Map keya por `p.id`.
  const thumbs = new Map<string, ProductThumb>(
    products.map((p) => [p.id, { url: p.photo.url, alt: p.photo.alt }]),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header com saudação dinâmica + pill pré-migração discreta */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-h2 font-bold text-olive-900">{greeting}, Ana.</h1>
          <p className="text-body-sm text-olive-700 italic">Aqui está o resumo de hoje.</p>
        </div>
        <span
          role="note"
          className="inline-flex items-center rounded-pill border border-divider bg-paper-100 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-olive-700 uppercase"
          title="Versão pré-migração — em breve esta área terá login próprio."
        >
          Pré-migração
        </span>
      </div>

      {/* Linha 1 — Hero de atenção (reativo, client) */}
      <section aria-labelledby="section-atencao">
        <h2 id="section-atencao" className="sr-only">
          Alertas que precisam de atenção
        </h2>
        <AttentionHero />
      </section>

      {/* Linha 2 — Faturamento do dia */}
      <section aria-labelledby="section-faturamento">
        <h2 id="section-faturamento" className="sr-only">
          Faturamento do dia
        </h2>
        <DayStatsGrid today={todayMetrics} yesterday={yesterdayMetrics} />
      </section>

      {/* Linha 3 — Top SKUs + Feed de pedidos recentes */}
      <section
        aria-labelledby="section-produtos-pedidos"
        className="grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        <h2 id="section-produtos-pedidos" className="sr-only">
          Produtos em destaque e pedidos recentes
        </h2>

        {/* Top SKUs — ocupa 2/3 em xl */}
        <div className="xl:col-span-2">
          <TopSkusList skus={topSkus} thumbs={thumbs} />
        </div>

        {/* Feed de pedidos recentes — ocupa 1/3 em xl */}
        <div className="xl:col-span-1">
          <RecentOrdersFeed />
        </div>
      </section>
    </div>
  );
}
