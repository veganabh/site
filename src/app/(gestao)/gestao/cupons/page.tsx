import { AdminGate } from "@/components/features/admin-gate";
import { AdminCouponsStoreHydrator } from "@/components/providers/admin-coupons-store-hydrator";
import { CuponsClient } from "@/components/admin/coupons/cupons-client";
import { listAdminCoupons } from "@/server/coupons";

export default async function CuponsPage() {
  const coupons = await listAdminCoupons();
  return (
    <AdminGate>
      <AdminCouponsStoreHydrator coupons={coupons} />
      <CuponsClient />
    </AdminGate>
  );
}
