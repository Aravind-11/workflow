import { ReceivingHub } from "@/components/logistics/receiving-hub";
import {
  listInboundDeliveries,
  listInventoryItemsLite,
  listLocations,
  listPurchaseOrders,
  listReceipts,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { pickString, serialize } from "@/lib/utils";

export default async function ReceivingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const warehouseId = pickString(params.warehouseId) ?? warehouses[0]?.id;

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
    <ReceivingHub
      warehouses={warehouses}
      initialWarehouseId={warehouseId}
      receipts={serialize(receipts)}
      purchaseOrders={serialize(purchaseOrders)}
      deliveries={serialize(deliveries)}
      inventoryItems={serialize(inventoryItems)}
      locations={serialize(locations)}
    />
  );
}
