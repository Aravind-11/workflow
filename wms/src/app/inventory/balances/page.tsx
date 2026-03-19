import Link from "next/link";
import { InventoryBalanceStatus } from "@prisma/client";
import { BalanceRowActions } from "@/features/inventory/components/balance-row-actions";
import { InventoryEmptyState } from "@/features/inventory/components/empty-state";
import { ReceiveInventoryToolbar } from "@/features/inventory/components/receive-inventory-toolbar";
import {
  getInventoryFilterOptions,
  getInventoryFormOptions,
  listInventoryBalances,
  listInventoryItems,
} from "@/features/inventory/service";

function spVal(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function InventoryBalancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = spVal(sp.search);
  const warehouseId = spVal(sp.warehouseId);
  const category = spVal(sp.category);
  const statusRaw = spVal(sp.status);
  const lowStockOnly = spVal(sp.lowStock) === "1";

  const status =
    statusRaw && Object.values(InventoryBalanceStatus).includes(statusRaw as InventoryBalanceStatus)
      ? (statusRaw as InventoryBalanceStatus)
      : undefined;

  const [rows, filterOptions, formOptions, catalogItems] = await Promise.all([
    listInventoryBalances({
      search,
      warehouseId,
      category,
      status,
      lowStockOnly,
    }),
    getInventoryFilterOptions(),
    getInventoryFormOptions(),
    listInventoryItems(undefined, undefined),
  ]);

  const itemOptions = catalogItems.map((i) => ({
    id: i.id,
    skuCode: i.skuCode,
    name: i.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Inventory balances</h2>
        <p className="text-sm text-gray-500">On-hand by warehouse and bin with lot and batch traceability.</p>
      </div>

      <ReceiveInventoryToolbar
        warehouses={formOptions.warehouses}
        locationsByWarehouse={formOptions.locationsByWarehouse}
        items={itemOptions}
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <label className="min-w-[200px] flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="SKU, name, barcode…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="min-w-[160px]">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Warehouse</span>
          <select
            name="warehouseId"
            defaultValue={warehouseId ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {filterOptions.warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[140px]">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[140px]">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Stock status</span>
          <select
            name="status"
            defaultValue={statusRaw ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.values(InventoryBalanceStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="lowStock" value="1" defaultChecked={lowStockOnly} />
          Low stock only
        </label>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Apply filters
        </button>
      </form>

      {rows.length === 0 ? (
        <InventoryEmptyState
          title="No inventory rows match your filters"
          description="Try clearing filters or receive stock to create balances."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Lot / batch</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">On hand</th>
                  <th className="px-4 py-3">Avail</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/items/${row.inventoryItemId}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {row.inventoryItem.skuCode}
                      </Link>
                      <p className="text-xs text-gray-500">{row.inventoryItem.name}</p>
                      {row.isLow ? (
                        <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900">
                          Low stock
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.warehouse.code}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.location.locationCode}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.lotNumber ?? "—"} / {row.batchNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.expiryDate ? row.expiryDate.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.onHandQty}{" "}
                      <span className="text-xs text-gray-500">{row.inventoryItem.uom}</span>
                    </td>
                    <td className="px-4 py-3">{row.available}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BalanceRowActions
                        balanceId={row.id}
                        locationId={row.locationId}
                        locationCode={row.location.locationCode}
                        onHandQty={row.onHandQty}
                        skuLabel={`${row.inventoryItem.skuCode} @ ${row.location.locationCode}`}
                        locations={formOptions.locationsByWarehouse[row.warehouseId] ?? []}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </div>
  );
}
