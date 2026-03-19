"use client";

import { useState } from "react";
import { AdjustStockModal } from "./adjust-stock-modal";
import { MoveStockModal } from "./move-stock-modal";

type Loc = { id: string; locationCode: string };

type Props = {
  balanceId: string;
  locationId: string;
  locationCode: string;
  onHandQty: number;
  skuLabel: string;
  locations: Loc[];
};

export function BalanceRowActions({
  balanceId,
  locationId,
  locationCode,
  onHandQty,
  skuLabel,
  locations,
}: Props) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setMoveOpen(true)}
      >
        Move
      </button>
      <button
        type="button"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setAdjOpen(true)}
      >
        Adjust
      </button>

      <MoveStockModal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        balanceId={balanceId}
        fromLabel={locationCode}
        maxQty={onHandQty}
        locations={locations}
        currentLocationId={locationId}
      />
      <AdjustStockModal
        open={adjOpen}
        onClose={() => setAdjOpen(false)}
        balanceId={balanceId}
        skuLabel={skuLabel}
        currentOnHand={onHandQty}
      />
    </div>
  );
}
