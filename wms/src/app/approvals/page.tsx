import { listPendingApprovals } from "@/features/approvals/actions";
import { ApprovalQueue } from "@/components/approvals/ApprovalQueue";
import { getSelectedWarehouseId } from "@/lib/warehouse-context";
import { serialize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const warehouseId = await getSelectedWarehouseId();
  const pending = await listPendingApprovals(warehouseId ?? undefined);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          Approval Queue
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review and approve pending workflow stage requests.
        </p>
      </header>

      <ApprovalQueue requests={serialize(pending)} />
    </div>
  );
}
