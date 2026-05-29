/**
 * /gestao — Dashboard operacional.
 *
 * Responde às três perguntas da dona em menos de 3 segundos:
 * 1. O que precisa da minha atenção agora?
 * 2. Como tá indo o dia?
 * 3. O que tá saindo mais?
 *
 * Estrutura:
 * - DashboardQuickActions (server, atalhos)
 * - DayStatsGrid (server, mock + métricas puras)
 * - TopSkusList + RecentOrdersFeed (lado a lado em xl)
 *
 * Alertas (pedidos novos/atrasados, estoque baixo) vivem nas abas Pedidos e
 * Cardápio. Hub de acesso aos módulos foi movido para /gestao/modulos.
 */

import type { Metadata } from "next";
import { calcDayMetrics, calcTopSkus } from "@/lib/dashboard-metrics";
import { listAllOrders } from "@/server/orders";
import { listProducts } from "@/server/products";
import { DashboardGreeting } from "@/components/admin/dashboard/dashboard-greeting";
import { DashboardQuickActions } from "@/components/admin/dashboard/dashboard-quick-actions";
import { DayStatsGrid } from "@/components/admin/dashboard/day-stats-grid";
import { TopSkusList, type ProductThumb } from "@/components/admin/dashboard/top-skus-list";
// Seção client reativa (Zustand) — import direto; Next 16 hidrata OK porque
// o arquivo declara "use client". `dynamic({ssr:false})` não é permitido
// em Server Components nesta versão.
// Alertas de atenção (pedidos novos/atrasados, estoque baixo) agora vivem nas
// próprias abas: Pedidos (header + DayStatsStrip) e Cardápio (CardapioStatsStrip).
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

  // Pós-migração orders: `item.productId` é UUID real → Map keya por `p.id`.
  const thumbs = new Map<string, ProductThumb>(
    products.map((p) => [p.id, { url: p.photo.url, alt: p.photo.alt }]),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header com saudação dinâmica + pill pré-migração discreta */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <DashboardGreeting />
        <span
          role="note"
          className="inline-flex items-center rounded-full border border-divider bg-paper-100 px-2.5 py-1 text-micro font-semibold tracking-wide text-olive-700 uppercase"
          title="Versão pré-migração — em breve esta área terá login próprio."
        >
          Pré-migração
        </span>
      </div>

      {/* Atalhos rápidos */}
      <DashboardQuickActions />

      {/* Linha 1 — Faturamento do dia */}
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
