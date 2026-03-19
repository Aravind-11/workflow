import { InventorySubNav } from "@/features/inventory/components/inventory-subnav";
import { P } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await requirePermission(P.inventory.view);
  return (
    <div className="min-h-screen">
      <div className="-mx-4 border-b border-gray-200 bg-white px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">SKUs, stock levels, movements, and adjustments</p>
        <InventorySubNav />
      </div>
      <div className="px-0 pb-6 pt-2 sm:pt-4">{children}</div>
    </div>
  );
}
