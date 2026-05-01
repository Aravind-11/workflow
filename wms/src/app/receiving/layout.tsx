import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

export default async function ReceivingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.receiving.manage);
  const state = await getNavState();
  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref="/receiving"
        defaultTitle="Inbound Receiving"
        description="Receipts against purchase orders and deliveries — inspect, stage, and post."
        active="receiving"
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
