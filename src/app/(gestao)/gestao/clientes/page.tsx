// /gestao/clientes — Inteligência de clientes (RFM + LTV) a partir de orders.

import type { Metadata } from "next";
import { AdminGate } from "@/components/features/admin-gate";
import { ClientesDashboard } from "@/components/admin/clientes/clientes-dashboard";
import { buildCustomerAnalytics } from "@/lib/customer-metrics";
import { listAllOrders } from "@/server/orders";

export const metadata: Metadata = {
  title: "Clientes — Gestão Vegana BH",
  description: "Segmentação RFM, LTV e recompra dos clientes.",
};

export default async function ClientesPage() {
  const orders = await listAllOrders();
  const analytics = buildCustomerAnalytics(orders);

  return (
    <AdminGate>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-olive-900">Clientes</h1>
          <p className="text-body-sm text-olive-700">
            Quem são, quanto valem e quem está sumindo — segmentação RFM a partir do histórico de
            pedidos.
          </p>
        </div>

        <ClientesDashboard analytics={analytics} />
      </div>
    </AdminGate>
  );
}
