"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Warehouse = { id: string; code: string; name: string };

export function WarehouseSelector({
  warehouses,
  currentId,
}: {
  warehouses: Warehouse[];
  currentId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("warehouseId", e.target.value);
    router.push("?" + params.toString());
  }

  const current = warehouses.find((w) => w.id === currentId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Warehouse</span>
      <select
        value={currentId}
        onChange={onChange}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm dark:border-navy-border dark:bg-navy-surface dark:text-gray-200"
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.code} — {w.name}
          </option>
        ))}
      </select>
      {current && (
        <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
          {current.name}
        </span>
      )}
    </div>
  );
}
