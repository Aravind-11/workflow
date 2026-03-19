import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function ReturnsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.returns.manage);
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Returns &amp; exceptions</h1>
        <p className="text-sm text-gray-500">
          RMAs, dispositions, and inventory impact — fully audited.
        </p>
      </div>
      {children}
    </div>
  );
}
