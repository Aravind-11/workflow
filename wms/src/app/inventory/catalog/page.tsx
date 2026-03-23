import { CatalogEditButton } from "@/features/inventory/components/catalog-edit-button";
import { InventoryEmptyState } from "@/features/inventory/components/empty-state";
import { CatalogToolbar } from "@/features/inventory/components/catalog-toolbar";
import { getInventoryFilterOptions, listInventoryItems } from "@/features/inventory/service";

function spVal(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function InventoryCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = spVal(sp.search);
  const category = spVal(sp.category);

  const [items, filterOptions] = await Promise.all([
    listInventoryItems(search, category),
    getInventoryFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SKU catalog</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Master item data: UOM, tracking flags, and reorder points for low-stock signals.
          </p>
        </div>
        <CatalogToolbar />
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end dark:border-navy-border dark:bg-navy-surface"
      >
        <label className="min-w-[220px] flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="SKU, name, barcode…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-100"
          />
        </label>
        <label className="min-w-[180px]">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Category</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-100"
          >
            <option value="">All</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      {items.length === 0 ? (
        <InventoryEmptyState
          title="No SKUs found"
          description="Add a SKU or adjust your search filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3">Reorder</th>
                  <th className="px-4 py-3">Tracking</th>
                  <th className="px-4 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50/80 dark:border-navy-border dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{item.skuCode}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{item.barcode ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{item.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.category ?? "—"}</td>
                    <td className="px-4 py-3">{item.uom}</td>
                    <td className="px-4 py-3">{item.reorderPoint ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      L{item.lotTracked ? "✓" : "—"} B{item.batchTracked ? "✓" : "—"} E
                      {item.expiryTracked ? "✓" : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CatalogEditButton item={item} />
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
