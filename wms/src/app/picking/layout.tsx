import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function PickingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.picking.manage);
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Picking</h1>
        <p className="text-sm text-gray-500">Pick lists tied to outbound shipments.</p>
      </div>
      {children}
    </div>
  );
}
