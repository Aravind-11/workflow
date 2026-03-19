import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function ShippingLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.shipping.manage);
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Outbound shipping</h1>
        <p className="text-sm text-gray-500">Shipments — pick → pack → ship with carriers and tracking.</p>
      </div>
      {children}
    </div>
  );
}
