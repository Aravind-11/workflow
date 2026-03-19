import { startOfWeek } from "date-fns";
import { DeliveriesHub } from "@/components/logistics/deliveries-hub";
import {
  listDeliveries,
  listDockAppointments,
  listWarehousesForSelect,
} from "@/features/logistics/service";
import { pickString, serialize } from "@/lib/utils";

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const warehouses = await listWarehousesForSelect();
  const warehouseId = pickString(params.warehouseId) ?? warehouses[0]?.id;
  const weekRaw = pickString(params.week);
  if (!warehouseId) {
    return <p className="text-sm text-amber-800">No warehouses configured.</p>;
  }

  const weekStart = weekRaw
    ? startOfWeek(new Date(weekRaw), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const [appointments, deliveries] = await Promise.all([
    listDockAppointments(warehouseId, weekStart),
    listDeliveries(warehouseId),
  ]);

  return (
    <DeliveriesHub
      warehouses={warehouses}
      warehouseId={warehouseId}
      weekStartIso={weekStart.toISOString()}
      appointments={serialize(appointments)}
      deliveries={serialize(deliveries)}
    />
  );
}
