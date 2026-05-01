import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

export default async function BatchesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.receiving.manage);
  const state = await getNavState();
  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref="/batches"
        defaultTitle="Batches"
        description="Compose received boxes into scan batches before they hit a scanner."
        active="batches"
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
