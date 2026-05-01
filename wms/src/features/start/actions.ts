"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setViewMode, clearViewMode } from "@/lib/auth/view-mode";
import { setSelectedWarehouseId } from "@/lib/warehouse-context";

/**
 * Admin entrypoint: cross-warehouse view, no scoping.
 *
 * We deliberately do NOT clear the warehouse cookie here — the user might
 * still want a "default focus" warehouse for pages that legitimately need
 * one (e.g. the operate tabs). The dashboard checks viewMode separately.
 */
export async function chooseAdminAction(): Promise<void> {
  await setViewMode("admin");
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Operator entrypoint: caller already picked a warehouse, so we set both
 * the mode and the selected warehouse cookie atomically.
 */
export async function chooseOperatorAction(warehouseId: string): Promise<void> {
  if (!warehouseId) throw new Error("warehouseId is required");
  await setSelectedWarehouseId(warehouseId);
  await setViewMode("operator");
  revalidatePath("/", "layout");
  redirect("/");
}

/** Reset back to the role-picker (used by the sidebar "switch" affordance). */
export async function resetViewModeAction(): Promise<void> {
  await clearViewMode();
  revalidatePath("/", "layout");
  redirect("/start");
}
