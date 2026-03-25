import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function WarehousesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.warehouses.view);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Warehouses"
        description="Directory of warehouse locations, zones, and capacity."
      />
      {children}
    </div>
  );
}
