import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

export default async function PickingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.picking.manage);
  const state = await getNavState();
  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref="/picking"
        defaultTitle="Scanning"
        description="Scan items from storage locations to fulfill outbound shipments."
        active="picking"
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
