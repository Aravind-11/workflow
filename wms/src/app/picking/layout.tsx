import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkflowBreadcrumb } from "@/components/ui/WorkflowBreadcrumb";

export default async function PickingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.picking.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Picking"
        description="Pick items from storage locations to fulfill outbound shipments."
      >
        <WorkflowBreadcrumb active="picking" />
      </SectionHeader>
      {children}
    </div>
  );
}
