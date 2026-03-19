import { prisma } from "@/server/db/prisma";
import { WarehouseStatus } from "@prisma/client";
import { InventoryEmptyState } from "@/features/inventory/components/empty-state";

export default async function InventoryLocationsPage() {
  const warehouses = await prisma.warehouse.findMany({
    where: { status: WarehouseStatus.ACTIVE },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const locations = await prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId: { in: warehouses.map((w) => w.id) } },
    include: { warehouse: { select: { code: true } } },
    orderBy: [{ warehouseId: "asc" }, { locationCode: "asc" }],
    take: 500,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
        <p className="text-sm text-gray-500">Zone / aisle / rack / bin hierarchy for putaway and picking.</p>
      </div>

      {locations.length === 0 ? (
        <InventoryEmptyState title="No locations" description="Seed the database or add locations via admin tools." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Aisle</th>
                  <th className="px-4 py-3">Rack</th>
                  <th className="px-4 py-3">Bin</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3">{loc.warehouse.code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{loc.locationCode}</td>
                    <td className="px-4 py-3">{loc.zone}</td>
                    <td className="px-4 py-3">{loc.aisle}</td>
                    <td className="px-4 py-3">{loc.rack}</td>
                    <td className="px-4 py-3">{loc.bin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </div>
  );
}
