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
    let current = true;

    new Promise<{ data: T[] | null }>((resolve) => resolve(build(supabase)))
      .then(({ data: rows }) => { if (current) setData(rows ?? []); })
      .catch((e: Error) => { if (current) setError(e.message); })
      .finally(() => { if (current) setLoading(false); });

    return () => { current = false; };
  }, [supabase, build]);

  return { data, loading, error };
}
