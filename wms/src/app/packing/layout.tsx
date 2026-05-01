import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { EditableFlowHeader } from "@/components/ui/EditableFlowHeader";
import { getNavState } from "@/lib/nav/state";

export default async function PackingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.packing.manage);
  const state = await getNavState();
  return (
    <div className="space-y-6">
      <EditableFlowHeader
        activeHref="/packing"
        defaultTitle="Packing"
        description="Verify picked quantities and pack into containers for shipping."
        active="packing"
        overrides={state.labels}
        hiddenOps={state.hidden}
        customOps={state.custom}
      />
      {children}
    </div>
  );
}
