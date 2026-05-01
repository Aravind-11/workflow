import { ReceivingHub } from "@/components/logistics/receiving-hub";
import { ExcelImportButton } from "@/components/logistics/excel-import-button";
import {
  listInboundDeliveries,
  listInventoryItemsLite,
  listLocations,
  listPurchaseOrders,
  listReceipts,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { resolveWarehouseScope } from "@/lib/warehouse-context";
import { pickString, serialize } from "@/lib/utils";

export default async function ReceivingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Resolve scope first — operator mode ignores ?warehouseId= and the
  // page is locked to the user's active site.
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

  const [receipts, purchaseOrders, deliveries, inventoryItems, locations] = await Promise.all([
    listReceipts(warehouseId),
    listPurchaseOrders(warehouseId),
    listInboundDeliveries(warehouseId),
    listInventoryItemsLite(400),
    listLocations(warehouseId),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExcelImportButton warehouseId={warehouseId} mode="receiving" />
      </div>
      <ReceivingHub
        warehouses={warehouses}
        initialWarehouseId={warehouseId}
        receipts={serialize(receipts)}
        purchaseOrders={serialize(purchaseOrders)}
        deliveries={serialize(deliveries)}
        inventoryItems={serialize(inventoryItems)}
        locations={serialize(locations)}
      />
    </div>
  );
}
