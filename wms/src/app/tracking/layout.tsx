import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function TrackingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.tracking.view);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Barcode Tracking"
        description="Scan or search a barcode to trace an item's journey through the warehouse."
      />
      {children}
    </div>
  );
}
