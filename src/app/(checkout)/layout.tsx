import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CheckoutStatusPanel } from "@/components/checkout/checkout-status-panel";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell showOrderPanel={false} rightPanel={<CheckoutStatusPanel />}>
      {children}
    </DashboardShell>
  );
}
