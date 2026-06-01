import { AdminGate } from "@/components/features/admin-gate";

export default function EncomendasLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
