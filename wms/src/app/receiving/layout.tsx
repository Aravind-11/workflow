import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function ReceivingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.receiving.manage);
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Inbound receiving</h1>
        <p className="text-sm text-gray-500">
          Receipts against purchase orders and deliveries — inspect, stage, and post.
        </p>
      </div>
      {children}
    </div>
  );
}
