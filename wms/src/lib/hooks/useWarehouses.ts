"use client";

import { useCallback } from "react";
import type { Warehouse } from "@/lib/types";
import { useSupabaseQuery } from "./useSupabaseQuery";

export function useWarehouses() {
  return useSupabaseQuery<Warehouse>(
    useCallback(
      (sb) => sb.from("warehouses").select("*").eq("active", true).order("name"),
      [],
    ),
  );
}
