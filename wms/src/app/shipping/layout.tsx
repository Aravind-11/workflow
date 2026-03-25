import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkflowBreadcrumb } from "@/components/ui/WorkflowBreadcrumb";

export default async function ShippingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.shipping.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Outbound Shipping"
        description="Assign carriers, print labels, and dispatch packed shipments."
      >
        <WorkflowBreadcrumb active="shipping" />
      </SectionHeader>
      {children}
    </div>
  );
}
