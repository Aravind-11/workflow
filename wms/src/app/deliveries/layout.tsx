import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function DeliveriesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.deliveries.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Deliveries & Dock"
        description="Dock appointments, check-in, and delivery status by warehouse."
      />
      {children}
    </div>
  );
}
