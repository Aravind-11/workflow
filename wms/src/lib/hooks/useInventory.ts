"use client";

import { useCallback } from "react";
import type { InventoryRow } from "@/lib/types";
import { useSupabaseQuery } from "./useSupabaseQuery";

export function useInventory() {
  return useSupabaseQuery<InventoryRow>(
    useCallback(
      (sb) =>
        sb
          .from("inventory")
          .select("*, skus(code,name,uom), warehouse_locations(code)")
          .order("updated_at", { ascending: false })
          .limit(100),
      [],
    ),
  );
}
