// /gestao/relatorios — Relatórios analíticos. Seção 1: Canais (site vs iFood).

import type { Metadata } from "next";
import Link from "next/link";
import { Store, Bike, AlertTriangle, MapPin, Clock } from "lucide-react";

import { AdminGate } from "@/components/features/admin-gate";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { buildChannelMetrics } from "@/lib/channel-metrics";
import { buildCouponRoi } from "@/lib/coupon-roi";
import { buildProductMargin } from "@/lib/product-margin";
import {
  PERIODS,
  PERIOD_LABEL,
  filterOrdersByPeriod,
  buildTimingMetrics,
  buildGeoMetrics,
  type Period,
} from "@/lib/order-insights";
import { listAllOrders } from "@/server/orders";
import { listProducts } from "@/server/products";
import { getNotificationAttribution } from "@/server/notification-attribution";

export const metadata: Metadata = {
  title: "Relatórios — Gestão Vegana BH",
  description: "Canais, cupons e engajamento — dados pra decisão estratégica.",
};

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period: Period = (PERIODS as readonly string[]).includes(rawPeriod ?? "")
    ? (rawPeriod as Period)
    : "all";

  const [allOrders, products] = await Promise.all([
    listAllOrders(),
    listProducts({ onlyActive: false }),
  ]);
  const orders = filterOrdersByPeriod(allOrders, period);

  const channel = buildChannelMetrics(orders);
  const couponRoi = buildCouponRoi(orders);
  const margin = buildProductMargin(orders, products);
  const geo = buildGeoMetrics(orders);
  const timing = buildTimingMetrics(orders);
  const attribution = await getNotificationAttribution();

  const sitePct = channel.siteSharePct === null ? null : Math.round(channel.siteSharePct * 100);

  // ── Alertas estratégicos (derivados) ──────────────────────────────────────
  const alerts: string[] = [];
  for (const c of couponRoi.coupons) {
    if (c.roi !== null && c.roi < 1) {
      alerts.push(`Cupom ${c.code} com ROI ${c.roi.toFixed(1)}x — desconto maior que retorno.`);
    }
  }
  if (margin.missingCostCount > 0) {
    alerts.push(
      `${margin.missingCostCount} produto(s) vendido(s) sem CPV cadastrado — margem incompleta.`,
    );
  }
  if (sitePct !== null && sitePct < 50 && channel.totalRevenue > 0) {
    alerts.push(`Só ${sitePct}% da receita vem do site — dependência alta do iFood.`);
  }

  return (
    <AdminGate>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 font-bold text-olive-900">Relatórios</h1>
            <p className="text-body-sm text-olive-700">
              Dados pra decisão — canais, margem, cupons, geografia e engajamento.
            </p>
          </div>
          {/* Filtro de período */}
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/gestao/relatorios?period=${p}`}
                className={cn(
                  "rounded-pill border px-2.5 py-0.5 text-micro font-semibold transition-colors",
                  period === p
                    ? "border-olive-900 bg-olive-900 text-paper-50"
                    : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
                )}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </div>
        </div>

        {/* Alertas estratégicos */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-warning/40 bg-warning/8 p-4">
            <div className="flex items-center gap-1.5 text-olive-900">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="text-body-sm font-bold">Atenção</span>
            </div>
            <ul className="flex flex-col gap-1">
              {alerts.map((a, i) => (
                <li key={i} className="text-caption text-olive-900">
                  • {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Canais: site vs iFood ─────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-body font-bold text-olive-900">Canais — migração do iFood</h2>
            <p className="text-caption text-olive-700">
              Quanto da receita já vem do canal próprio. Objetivo: subir o site, reduzir dependência
              do iFood.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <ChannelCard
              icon={Store}
              label="Receita site"
              value={formatBRL(channel.site.revenue)}
              hint={`${channel.site.orders} pedidos · ${formatBRL(channel.site.avgTicket)} ticket`}
              tone="leaf"
            />
            <ChannelCard
              icon={Bike}
              label="Receita iFood"
              value={formatBRL(channel.ifood.revenue)}
              hint={`${channel.ifood.orders} pedidos · ${formatBRL(channel.ifood.avgTicket)} ticket`}
              tone="terra"
            />
            <Card padding="none" className="flex flex-col gap-2 p-4">
              <span className="text-caption font-semibold tracking-wide text-olive-700 uppercase">
                % no site
              </span>
              <span className="text-h4 font-bold text-olive-900">
                {sitePct === null ? "—" : `${sitePct}%`}
              </span>
              <span className="text-caption text-olive-700/70">da receita total</span>
            </Card>
            <Card padding="none" className="flex flex-col gap-2 p-4">
              <span className="text-caption font-semibold tracking-wide text-olive-700 uppercase">
                Receita total
              </span>
              <span className="text-h4 font-bold text-olive-900">
                {formatBRL(channel.totalRevenue)}
              </span>
              <span className="text-caption text-olive-700/70">site + iFood</span>
            </Card>
          </div>

          {/* Tendência mensal — barras empilhadas (site vs iFood) */}
          <Card padding="none" className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body-sm font-bold text-olive-900">Evolução mensal</h3>
              <div className="flex items-center gap-3 text-caption text-olive-700">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-leaf-500" /> Site
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-terra-500" /> iFood
                </span>
              </div>
            </div>

            {channel.byMonth.length === 0 ? (
              <p className="text-caption text-olive-700">Sem pedidos ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {channel.byMonth.map((m) => {
                  const pct = m.siteSharePct === null ? 0 : Math.round(m.siteSharePct * 100);
                  return (
                    <li key={m.month} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-caption text-olive-700">
                        {monthLabel(m.month)}
                      </span>
                      <div className="flex h-5 flex-1 overflow-hidden rounded-sm bg-paper-100">
                        <div
                          className="bg-leaf-500"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                        <div
                          className="bg-terra-500"
                          style={{ width: `${100 - pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-caption font-semibold text-olive-900">
                        {m.siteSharePct === null ? "—" : `${pct}%`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        {/* ── Cupons: ROI ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-body font-bold text-olive-900">Cupons — ROI</h2>
            <p className="text-caption text-olive-700">
              Receita gerada por cupom vs desconto dado. ROI = receita ÷ desconto (quanto cada R$1
              de desconto trouxe de volta).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SimpleStat label="Usos" value={String(couponRoi.totalUses)} hint="pedidos com cupom" />
            <SimpleStat
              label="Desconto dado"
              value={formatBRL(couponRoi.totalDiscount)}
              hint="total concedido"
            />
            <SimpleStat
              label="Receita c/ cupom"
              value={formatBRL(couponRoi.totalRevenue)}
              hint="pedidos com cupom"
            />
            <SimpleStat
              label="ROI médio"
              value={couponRoi.overallRoi === null ? "—" : `${couponRoi.overallRoi.toFixed(1)}x`}
              hint="receita ÷ desconto"
            />
          </div>

          {couponRoi.coupons.length === 0 ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">Nenhum cupom usado ainda.</p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Cupom", "Usos", "Desconto", "Receita", "Ticket médio", "ROI"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {couponRoi.coupons.map((c) => (
                    <tr key={c.code} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {c.code}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">{c.uses}</td>
                      <td className="px-3 py-2 text-caption text-terra-700">
                        −{formatBRL(c.discountGiven)}
                      </td>
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {formatBRL(c.revenue)}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">
                        {formatBRL(c.avgTicket)}
                      </td>
                      <td className="px-3 py-2 text-caption font-semibold text-leaf-700">
                        {c.roi === null ? "—" : `${c.roi.toFixed(1)}x`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        {/* ── Notificação → compra (atribuição) ─────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-body font-bold text-olive-900">Notificação → compra</h2>
            <p className="text-caption text-olive-700">
              Cliente logado que clicou no CTA e comprou em até {attribution.windowDays} dias. Mede
              se a notificação vende. (Clique anônimo não atribui — sem identidade.)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SimpleStat
              label="Cliques"
              value={String(attribution.totalClicks)}
              hint="logados (atribuíveis)"
            />
            <SimpleStat
              label="Conversões"
              value={String(attribution.totalConversions)}
              hint="clicou e comprou"
            />
            <SimpleStat
              label="Taxa conversão"
              value={
                attribution.overallConvRate === null
                  ? "—"
                  : `${Math.round(attribution.overallConvRate * 100)}%`
              }
              hint="conversões ÷ cliques"
            />
            <SimpleStat
              label="Receita atribuída"
              value={formatBRL(attribution.totalAttributedRevenue)}
              hint="pedidos pós-clique"
            />
          </div>

          {attribution.rows.length === 0 ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">Nenhum clique de cliente logado ainda.</p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Notificação", "Cliques", "Conversões", "Taxa", "Receita atribuída"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {attribution.rows.map((r) => (
                    <tr key={r.notificationId} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2">
                        <span className="block truncate text-caption font-semibold text-olive-900">
                          {r.title}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">{r.clicks}</td>
                      <td className="px-3 py-2 text-caption text-olive-700">{r.conversions}</td>
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {r.convRate === null ? "—" : `${Math.round(r.convRate * 100)}%`}
                      </td>
                      <td className="px-3 py-2 text-caption font-semibold text-leaf-700">
                        {formatBRL(r.attributedRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        {/* ── Margem por produto ────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-body font-bold text-olive-900">Margem por produto</h2>
            <p className="text-caption text-olive-700">
              Receita − custo (CPV). Cadastre o CPV no produto pra ver margem real. Sem CPV = margem
              incompleta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <SimpleStat
              label="Receita"
              value={formatBRL(margin.totalRevenue)}
              hint="produtos vendidos"
            />
            <SimpleStat
              label="Custo (CPV)"
              value={formatBRL(margin.totalCost)}
              hint="só com CPV informado"
            />
            <SimpleStat
              label="Margem"
              value={formatBRL(margin.totalMargin)}
              hint="receita − custo"
            />
            <SimpleStat
              label="Margem %"
              value={
                margin.overallMarginPct === null
                  ? "—"
                  : `${Math.round(margin.overallMarginPct * 100)}%`
              }
              hint="margem ÷ receita"
            />
          </div>

          {margin.rows.length === 0 ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">Nenhuma venda no período.</p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Produto", "Vendidos", "Receita", "Custo", "Margem", "Margem %"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {margin.rows.map((r) => (
                    <tr key={r.productId} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">{r.unitsSold}</td>
                      <td className="px-3 py-2 text-caption text-olive-900">
                        {formatBRL(r.revenue)}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">
                        {r.hasCost ? (
                          formatBRL(r.cost)
                        ) : (
                          <span className="text-terra-700">sem CPV</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {r.hasCost ? formatBRL(r.margin) : "—"}
                      </td>
                      <td className="px-3 py-2 text-caption font-semibold text-leaf-700">
                        {r.marginPct === null ? "—" : `${Math.round(r.marginPct * 100)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        {/* ── Geografia (por bairro) ────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-olive-700" aria-hidden="true" />
            <h2 className="text-body font-bold text-olive-900">Pedidos por bairro</h2>
          </div>
          {geo.length === 0 ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">Nenhum pedido no período.</p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Bairro", "Pedidos", "Receita"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-caption font-semibold tracking-wide text-olive-700 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {geo.map((g) => (
                    <tr key={g.neighborhood} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {g.neighborhood}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">{g.orders}</td>
                      <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                        {formatBRL(g.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        {/* ── Pico (dia + hora) ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-olive-700" aria-hidden="true" />
            <h2 className="text-body font-bold text-olive-900">Pico de pedidos</h2>
          </div>
          <p className="text-caption text-olive-700">
            Pico: <strong>{timing.peakWeekday ?? "—"}</strong>
            {timing.peakHour !== null ? `, ~${String(timing.peakHour).padStart(2, "0")}h` : ""}. Bom
            pra programar produção e disparar notificação.
          </p>
          <Card padding="none" className="flex flex-col gap-3 p-4">
            <span className="text-caption font-semibold text-olive-700">Por dia da semana</span>
            <ul className="flex flex-col gap-1.5">
              {timing.byWeekday.map((w) => {
                const pct =
                  timing.maxWeekdayOrders > 0 ? (w.orders / timing.maxWeekdayOrders) * 100 : 0;
                return (
                  <li key={w.day} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 text-caption text-olive-700">{w.day}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-sm bg-paper-100">
                      <div
                        className="h-full bg-olive-500"
                        style={{ width: `${pct}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-caption font-semibold text-olive-900">
                      {w.orders}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      </div>
    </AdminGate>
  );
}

function SimpleStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card padding="none" className="flex flex-col gap-2 p-4">
      <span className="text-caption font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <span className="text-h4 font-bold text-olive-900">{value}</span>
      <span className="text-caption text-olive-700/70">{hint}</span>
    </Card>
  );
}

function ChannelCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  tone: "leaf" | "terra";
}) {
  return (
    <Card padding="none" className="flex flex-col gap-2 p-4">
      <div
        className={cn(
          "flex items-center gap-1.5",
          tone === "leaf" ? "text-leaf-700" : "text-terra-700",
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-caption font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <span className="text-h4 font-bold text-olive-900">{value}</span>
      <span className="text-caption text-olive-700/70">{hint}</span>
    </Card>
  );
}
