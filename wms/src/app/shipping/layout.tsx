import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

export default async function ShippingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.shipping.manage);
  const state = await getNavState();
  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref="/shipping"
        defaultTitle="Outbound Shipping"
        description="Assign carriers, print labels, and dispatch packed shipments."
        active="shipping"
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
