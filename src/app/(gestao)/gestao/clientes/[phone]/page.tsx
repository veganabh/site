// /gestao/clientes/[phone] — Detalhe do cliente: RFM + pedidos + log de notificações.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Eye, MousePointerClick } from "lucide-react";

import { AdminGate } from "@/components/features/admin-gate";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { buildCustomerAnalytics, SEGMENT_LABELS } from "@/lib/customer-metrics";
import { listAllOrders } from "@/server/orders";
import { getProfileIdByPhone, getCustomerNotificationLog } from "@/server/customer-detail";

export const metadata: Metadata = { title: "Cliente — Gestão Vegana BH" };

type PageProps = { params: Promise<{ phone: string }> };

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ClienteDetalhePage({ params }: PageProps) {
  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);

  const orders = await listAllOrders();
  const analytics = buildCustomerAnalytics(orders);
  const customer = analytics.customers.find((c) => c.phone === phone);

  if (!customer) notFound();

  const customerOrders = orders
    .filter((o) => o.customerPhone === phone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const profileId = await getProfileIdByPhone(phone);
  const notifLog = profileId ? await getCustomerNotificationLog(profileId) : [];

  return (
    <AdminGate>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/gestao/clientes"
            className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-olive-700 transition-colors hover:text-olive-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar aos clientes
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 font-bold text-olive-900">{customer.name}</h1>
            <span className="rounded-pill bg-olive-900/10 px-2 py-0.5 text-caption font-bold tracking-wide text-olive-900 uppercase">
              {SEGMENT_LABELS[customer.segment]}
            </span>
          </div>
          <p className="text-body-sm text-olive-700">
            {customer.phone} · {profileId ? "Cliente com conta" : "Sem conta (convidado/iFood)"}
          </p>
        </div>

        {/* Stats RFM */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Pedidos" value={String(customer.orders)} />
          <StatCard label="LTV" value={formatBRL(customer.totalSpent)} />
          <StatCard label="Ticket médio" value={formatBRL(customer.avgTicket)} />
          <StatCard
            label="Último pedido"
            value={customer.recencyDays === 0 ? "hoje" : `${customer.recencyDays}d atrás`}
          />
        </div>

        {/* Pedidos */}
        <section className="flex flex-col gap-2">
          <h2 className="text-body-sm font-bold text-olive-900">
            Pedidos ({customerOrders.length})
          </h2>
          <Card padding="none" className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-b border-divider">
                  {["#", "Data", "Total", "Status", "Canal"].map((h) => (
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
                {customerOrders.map((o) => (
                  <tr key={o.id} className="border-b border-divider last:border-0">
                    <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                      #{o.orderNumber}
                    </td>
                    <td className="px-3 py-2 text-caption text-olive-700">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-caption font-semibold text-olive-900">
                      {formatBRL(o.total)}
                    </td>
                    <td className="px-3 py-2 text-caption text-olive-700">{o.status}</td>
                    <td className="px-3 py-2 text-caption text-olive-700">
                      {o.source === "site" ? "Site" : "iFood"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Log de notificações */}
        <section className="flex flex-col gap-2">
          <h2 className="text-body-sm font-bold text-olive-900">Engajamento em notificações</h2>
          {!profileId ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">
                Cliente sem conta — leitura/clique de notificação só é rastreado por conta logada.
              </p>
            </Card>
          ) : notifLog.length === 0 ? (
            <Card padding="none" className="border-dashed p-6 text-center">
              <p className="text-caption text-olive-700">
                Nenhuma interação com notificações ainda.
              </p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-divider">
                    {["Notificação", "Abriu", "Clicou no CTA"].map((h) => (
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
                  {notifLog.map((e) => (
                    <tr key={e.notificationId} className="border-b border-divider last:border-0">
                      <td className="px-3 py-2">
                        <span className="block truncate text-caption font-semibold text-olive-900">
                          {e.title}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">
                        {e.readAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5 text-leaf-700" aria-hidden="true" />
                            {formatDateTime(e.readAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-caption text-olive-700">
                        {e.clickedAt ? (
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick
                              className="h-3.5 w-3.5 text-terra-700"
                              aria-hidden="true"
                            />
                            {formatDateTime(e.clickedAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      </div>
    </AdminGate>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="none" className="flex flex-col gap-1 p-4">
      <span className="text-caption font-semibold tracking-wide text-olive-700 uppercase">
        {label}
      </span>
      <span className="text-h4 font-bold text-olive-900">{value}</span>
    </Card>
  );
}
