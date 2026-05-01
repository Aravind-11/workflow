"use server";

import { revalidatePath } from "next/cache";
import { setSelectedWarehouseId, setSelectedProjectId } from "@/lib/warehouse-context";

export async function switchWarehouseAction(warehouseId: string) {
  await setSelectedWarehouseId(warehouseId);
  revalidatePath("/", "layout");
}

export async function switchProjectAction(projectId: string) {
  await setSelectedProjectId(projectId || null);
  revalidatePath("/", "layout");
}
