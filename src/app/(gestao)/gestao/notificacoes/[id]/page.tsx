import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminGate } from "@/components/features/admin-gate";
import { NotificacaoForm } from "@/components/admin/notifications/notificacao-form";
import { getNotificationById } from "@/server/notifications";
import { listAdminCoupons } from "@/server/coupons";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const notification = await getNotificationById(id);
  return {
    title: notification
      ? `Editar "${notification.title}" — Gestão Veg.ana`
      : "Notificação não encontrada — Gestão Veg.ana",
  };
}

export default async function EditarNotificacaoPage({ params }: PageProps) {
  const { id } = await params;
  const [notification, coupons] = await Promise.all([
    getNotificationById(id),
    listAdminCoupons(),
  ]);

  if (!notification) notFound();

  const activeCoupons = coupons
    .filter((c) => c.status === "ATIVO")
    .map((c) => ({ code: c.code, label: c.label }));

  return (
    <AdminGate>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-olive-900">Editar notificação</h1>
          <p className="text-body-sm text-olive-700 line-clamp-1">{notification.title}</p>
        </div>
        <NotificacaoForm mode="editar" notification={notification} coupons={activeCoupons} />
      </div>
    </AdminGate>
  );
}
