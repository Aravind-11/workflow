"use client";

import { useCallback } from "react";
import type { Worker } from "@/lib/types";
import { useSupabaseQuery } from "./useSupabaseQuery";

export function useWorkers() {
  return useSupabaseQuery<Worker>(
    useCallback(
      (sb) => sb.from("workers").select("*").eq("active", true).order("name"),
      [],
    ),
  );
}
