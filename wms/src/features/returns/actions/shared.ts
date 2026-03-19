import { InventoryBalanceStatus, ReturnDisposition } from "@prisma/client";
import { revalidatePath } from "next/cache";

export function revalidateReturns(returnRmaId?: string) {
  revalidatePath("/returns");
  if (returnRmaId) revalidatePath(`/returns/${returnRmaId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/balances");
}

export function normLot(value?: string | null) {
  const v = value?.trim();
  return v ? v : null;
}

export function balanceStatusForDisposition(d: ReturnDisposition): InventoryBalanceStatus {
  switch (d) {
    case ReturnDisposition.RESTOCK:
      return InventoryBalanceStatus.AVAILABLE;
    case ReturnDisposition.REFURBISH:
      return InventoryBalanceStatus.HOLD;
    case ReturnDisposition.QUARANTINE:
      return InventoryBalanceStatus.QUARANTINE;
    default:
      throw new Error("Invalid disposition for stock");
  }
}
