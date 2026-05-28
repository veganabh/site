"use client";

import { useMemo, useState } from "react";
import { Users, Repeat, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import {
  SEGMENT_LABELS,
  type CustomerAnalytics,
  type CustomerSegment,
} from "@/lib/customer-metrics";

const SEGMENT_BADGE: Record<CustomerSegment, string> = {
  campeao: "bg-leaf-500/15 text-leaf-700",
  fiel: "bg-olive-900/10 text-olive-900",
  novo: "bg-info/15 text-info",
  "em-risco": "bg-warning/15 text-olive-900",
  perdido: "bg-terra-500/15 text-terra-700",
};

const SEGMENT_ORDER: CustomerSegment[] = ["campeao", "fiel", "novo", "em-risco", "perdido"];

type FilterValue = "todos" | CustomerSegment;

export function ClientesDashboard({ analytics }: { analytics: CustomerAnalytics }) {
  const [filter, setFilter] = useState<FilterValue>("todos");

  const rows = useMemo(
    () =>
      filter === "todos"
        ? analytics.customers
        : analytics.customers.filter((c) => c.segment === filter),
    [analytics.customers, filter],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Cards globais */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="Clientes" value={String(analytics.totalCustomers)} hint="únicos (por telefone)" icon={Users} />
        <MetricCard
          label="Recompra"
          value={`${Math.round(analytics.repeatRate * 100)}%`}
          hint="com 2+ pedidos"
          icon={Repeat}
        />
        <MetricCard label="LTV médio" value={formatBRL(analytics.avgLtv)} hint="receita ÷ cliente" icon={TrendingUp} />
        <MetricCard label="Receita total" value={formatBRL(analytics.totalRevenue)} hint="pedidos realizados" icon={DollarSign} />
      </div>

      {/* Filtro de segmento */}
      <div className="flex flex-wrap gap-1.5">
        <SegChip active={filter === "todos"} onClick={() => setFilter("todos")}>
          Todos ({analytics.totalCustomers})
        </SegChip>
        {SEGMENT_ORDER.map((seg) => (
          <SegChip key={seg} active={filter === seg} onClick={() => setFilter(seg)}>
            {SEGMENT_LABELS[seg]} ({analytics.segmentCounts[seg]})
          </SegChip>
        ))}
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider bg-paper-50 p-10 text-center">
          <p className="text-body-sm font-semibold text-olive-900">Nenhum cliente neste segmento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-divider bg-paper-50 shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-divider">
                {["Cliente", "Pedidos", "LTV", "Ticket médio", "Último pedido", "Canal", "Segmento"].map((h) => (
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
              {rows.map((c) => (
                <tr key={c.phone} className="border-b border-divider transition-colors last:border-0 hover:bg-paper-100/50">
                  <td className="px-3 py-2">
                    <span className="block truncate text-caption font-semibold text-olive-900">{c.name}</span>
                    <span className="text-caption text-olive-700/70">{c.phone}</span>
                  </td>
                  <td className="px-3 py-2 text-caption text-olive-900">{c.orders}</td>
                  <td className="px-3 py-2 text-caption font-semibold text-olive-900">{formatBRL(c.totalSpent)}</td>
                  <td className="px-3 py-2 text-caption text-olive-700">{formatBRL(c.avgTicket)}</td>
                  <td className="px-3 py-2 text-caption text-olive-700">
                    {c.recencyDays === 0 ? "hoje" : `${c.recencyDays}d atrás`}
                  </td>
                  <td className="px-3 py-2 text-caption text-olive-700">
                    {c.channels.map((ch) => (ch === "site" ? "Site" : "iFood")).join(" · ")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-pill px-2 py-0 text-[10px] font-bold tracking-wide uppercase",
                        SEGMENT_BADGE[c.segment],
                      )}
                    >
                      {SEGMENT_LABELS[c.segment]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-divider bg-paper-50 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-olive-700">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-caption font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <span className="text-h4 font-bold text-olive-900">{value}</span>
      <span className="text-caption text-olive-700/70">{hint}</span>
    </div>
  );
}

function SegChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-olive-900 bg-olive-900 text-paper-50"
          : "border-divider bg-paper-50 text-olive-700 hover:bg-paper-100",
      )}
    >
      {children}
    </button>
  );
}
