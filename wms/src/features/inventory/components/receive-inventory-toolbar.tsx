"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReceiveStockModal } from "./receive-stock-modal";

type Warehouse = { id: string; code: string; name: string };
type Loc = { id: string; warehouseId: string; locationCode: string };
type Item = { id: string; skuCode: string; name: string };

type Props = {
  warehouses: Warehouse[];
  locationsByWarehouse: Record<string, Loc[]>;
  items: Item[];
  defaultInventoryItemId?: string;
};

export function ReceiveInventoryToolbar({ defaultInventoryItemId, ...props }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Receive inbound stock into a bin. Lot, batch, and expiry are optional based on item tracking.
      </p>
      <Button type="button" onClick={() => setOpen(true)}>
        Receive stock
      </Button>
      <ReceiveStockModal
        open={open}
        onClose={() => setOpen(false)}
        defaultInventoryItemId={defaultInventoryItemId}
        {...props}
      />
    </div>
  );
}
