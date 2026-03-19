"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSupabaseQuery<T>(
  build: (client: ReturnType<typeof createClient>) => PromiseLike<{ data: T[] | null }>,
) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    build(supabase)
      .then(({ data: rows }) => setData(rows ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [supabase, build]);

  return { data, loading, error };
}
