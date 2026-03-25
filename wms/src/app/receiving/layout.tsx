import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkflowBreadcrumb } from "@/components/ui/WorkflowBreadcrumb";

export default async function ReceivingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.receiving.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Inbound Receiving"
        description="Receipts against purchase orders and deliveries — inspect, stage, and post."
      >
        <WorkflowBreadcrumb active="receiving" />
      </SectionHeader>
      {children}
    </div>
  );
}
