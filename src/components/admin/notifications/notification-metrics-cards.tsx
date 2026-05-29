/**
 * Cards de métricas das notificações. Presentational — recebe o agregado
 * pronto de getNotificationMetrics. Estilo alinhado ao DS do painel
 * (card p-4 rounded-lg shadow-sm, valor text-h4).
 */

import { Send, Eye, MousePointerClick, Percent } from "lucide-react";
import type { NotificationMetrics } from "@/server/notifications";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
};

function MetricCard({ label, value, hint, icon: Icon }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-divider bg-paper-50 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-olive-700">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-caption font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <span className="text-h4 font-bold text-olive-900">{value}</span>
      <span className="text-caption text-olive-700/70">{hint ?? " "}</span>
    </div>
  );
}

export function NotificationMetricsCards({ metrics }: { metrics: NotificationMetrics }) {
  const ctrLabel =
    metrics.overallCtr === null ? "—" : `${Math.round(metrics.overallCtr * 100)}%`;

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <MetricCard
        label="Criadas"
        value={String(metrics.totalNotifications)}
        hint="broadcasts no painel"
        icon={Send}
      />
      <MetricCard
        label="Leituras"
        value={String(metrics.totalReads)}
        hint="abertas no sino"
        icon={Eye}
      />
      <MetricCard
        label="Cliques no CTA"
        value={String(metrics.totalClicks)}
        hint="botões clicados"
        icon={MousePointerClick}
      />
      <MetricCard
        label="CTR médio"
        value={ctrLabel}
        hint="cliques ÷ leituras"
        icon={Percent}
      />
    </div>
  );
}
