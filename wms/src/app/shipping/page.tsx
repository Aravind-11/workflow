import { ShipmentHub } from "@/components/logistics/shipment-hub";
import {
  listInventoryItemsLite,
  listShipments,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { pickString, serialize } from "@/lib/utils";

export default async function ShippingPage({
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

  const [shipments, items] = await Promise.all([
    listShipments(warehouseId),
    listInventoryItemsLite(400),
  ]);

  return (
    <ShipmentHub
      warehouses={warehouses}
      warehouseId={warehouseId}
      shipments={serialize(shipments)}
      inventoryItems={serialize(items)}
    />
  );
}
