import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminGate } from "@/components/features/admin-gate";
import { NotificacoesListClient } from "@/components/admin/notifications/notificacoes-list-client";
import { NotificationMetricsCards } from "@/components/admin/notifications/notification-metrics-cards";
import { listAdminNotifications, getNotificationMetrics } from "@/server/notifications";

export default async function NotificacoesPage() {
  const [notifications, metrics] = await Promise.all([
    listAdminNotifications(),
    getNotificationMetrics(),
  ]);

  return (
    <AdminGate>
      <div className="flex flex-col gap-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 font-bold text-olive-900">Notificações</h1>
            <p className="text-body-sm text-olive-700">
              Avisos broadcast para clientes — promoções, lançamentos, operacional.
            </p>
          </div>
          <Link
            href="/gestao/notificacoes/nova"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-olive-900 px-4 text-body-sm font-semibold text-paper-50 transition-colors hover:bg-olive-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova notificação
          </Link>
        </div>

        {/* Métricas */}
        <NotificationMetricsCards metrics={metrics} />

        {/* Lista */}
        <NotificacoesListClient notifications={notifications} statsById={metrics.byId} />
      </div>
    </AdminGate>
  );
}
