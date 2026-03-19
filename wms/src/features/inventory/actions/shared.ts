import { revalidatePath } from "next/cache";

export function normLot(value?: string | null) {
  const v = value?.trim();
  return v ? v : null;
}

export function revalidateInventory(itemId?: string | null) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/balances");
  if (itemId) revalidatePath(`/inventory/items/${itemId}`);
}
