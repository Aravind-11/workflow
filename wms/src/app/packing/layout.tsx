import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WorkflowBreadcrumb } from "@/components/ui/WorkflowBreadcrumb";

export default async function PackingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.packing.manage);
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Packing"
        description="Verify picked quantities and pack into containers for shipping."
      >
        <WorkflowBreadcrumb active="packing" />
      </SectionHeader>
      {children}
    </div>
  );
}
