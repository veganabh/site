import type { Metadata } from "next";

import { AdminGate } from "@/components/features/admin-gate";
import { NotificacaoForm } from "@/components/admin/notifications/notificacao-form";
import { listAdminCoupons } from "@/server/coupons";

export const metadata: Metadata = {
  title: "Nova notificação — Gestão Veg.ana",
};

export default async function NovaNotificacaoPage() {
  const coupons = await listAdminCoupons();
  const activeCoupons = coupons
    .filter((c) => c.status === "ATIVO")
    .map((c) => ({ code: c.code, label: c.label }));

  return (
    <AdminGate>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-olive-900">Nova notificação</h1>
          <p className="text-body-sm text-olive-700">
            Preencha os campos e publique para exibir no sino dos clientes.
          </p>
        </div>
        <NotificacaoForm mode="nova" coupons={activeCoupons} />
      </div>
    </AdminGate>
  );
}
