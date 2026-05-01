import { ShipmentHub } from "@/components/logistics/shipment-hub";
import { ExcelImportButton } from "@/components/logistics/excel-import-button";
import {
  listInventoryItemsLite,
  listShipments,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString, serialize } from "@/lib/utils";

export default async function ShippingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [warehouses, scope] = await Promise.all([
    listWarehousesForSelect(),
    resolveWarehouseScope(pickString(params.warehouseId)),
  ]);
  const warehouseId =
    scope.id
    ?? warehouses.find((w) => w.code === "LACO-MAIL")?.id
    ?? warehouses[0]?.id;
  if (!warehouseId) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        No warehouses configured.
      </p>
    );
  }

  const [shipments, items] = await Promise.all([
    listShipments(warehouseId),
    listInventoryItemsLite(400),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExcelImportButton warehouseId={warehouseId} mode="shipping" />
      </div>
      <ShipmentHub
        warehouses={warehouses}
        warehouseId={warehouseId}
        shipments={serialize(shipments)}
        inventoryItems={serialize(items)}
      />
    </div>
  );
}
