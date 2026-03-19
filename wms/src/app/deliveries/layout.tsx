import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function DeliveriesLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.deliveries.manage);
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Deliveries &amp; dock</h1>
        <p className="text-sm text-gray-500">
          Dock appointments, check-in, and delivery status by warehouse.
        </p>
      </div>
      {children}
    </div>
  );
}
