import { ShipmentStatus, TaskStatus, ReceiptStatus, WarehouseStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/server/db/prisma";
import { OperatorPicker } from "@/components/start/operator-picker";

export const dynamic = "force-dynamic";

export default async function OperatorStartPage() {
  const ctx = await requireAuth();

  // Demo / preview environment: anyone who picks "Operator" on /start can
  // jump into any active warehouse. Previously this was filtered to
  // ctx.warehouseIds (the user's assignment list), which made teammates
  // see an empty grid. Strict RBAC scoping can come back via canAccessWarehouse.
  const warehouses = await prisma.warehouse.findMany({
    where: {
      status: WarehouseStatus.ACTIVE,
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      city: true,
      state: true,
      country: true,
      _count: {
        select: {
          shipments: {
            where: {
              status: { in: [ShipmentStatus.CREATED, ShipmentStatus.PICKED, ShipmentStatus.PACKED] },
            },
          },
          tasks: {
            where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
          },
          receipts: {
            where: { status: { in: [ReceiptStatus.DRAFT, ReceiptStatus.RECEIVED] } },
          },
        },
      },
    },
  });

  return (
    <OperatorPicker
      userLabel={ctx.nickname ?? ctx.fullName ?? ctx.email}
      warehouses={warehouses.map((w) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        city: w.city,
        state: w.state,
        country: w.country,
        openShipments: w._count.shipments,
        activeTasks: w._count.tasks,
        openReceipts: w._count.receipts,
      }))}
    />
  );
}
