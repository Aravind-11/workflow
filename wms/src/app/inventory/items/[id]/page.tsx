import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceRowActions } from "@/features/inventory/components/balance-row-actions";
import { CatalogEditButton } from "@/features/inventory/components/catalog-edit-button";
import { InventoryEmptyState } from "@/features/inventory/components/empty-state";
import { ReceiveInventoryToolbar } from "@/features/inventory/components/receive-inventory-toolbar";
import {
  getInventoryFormOptions,
  getInventoryItemById,
  listTransactionsForItem,
} from "@/features/inventory/service";

export default async function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, txs, formOptions] = await Promise.all([
    getInventoryItemById(id),
    listTransactionsForItem(id, 150),
    getInventoryFormOptions(),
  ]);

  if (!item) notFound();

  const itemOptions = [{ id: item.id, skuCode: item.skuCode, name: item.name }];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            <Link href="/inventory/catalog" className="text-blue-700 hover:underline">
              Catalog
            </Link>{" "}
            / {item.skuCode}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-900">{item.name}</h2>
          <dl className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-gray-500">SKU</dt>
              <dd className="font-mono">{item.skuCode}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Barcode</dt>
              <dd className="font-mono">{item.barcode ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Category</dt>
              <dd>{item.category ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">UOM</dt>
              <dd>{item.uom}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Reorder point</dt>
              <dd>{item.reorderPoint ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Tracking</dt>
              <dd className="text-xs">
                Lot {item.lotTracked ? "yes" : "no"} · Batch {item.batchTracked ? "yes" : "no"} · Expiry{" "}
                {item.expiryTracked ? "yes" : "no"}
              </dd>
            </div>
          </dl>
        </div>
        <CatalogEditButton item={item} />
      </div>

      <ReceiveInventoryToolbar
        warehouses={formOptions.warehouses}
        locationsByWarehouse={formOptions.locationsByWarehouse}
        items={itemOptions}
        defaultInventoryItemId={item.id}
      />

      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Balances by location</h3>
        {item.balances.length === 0 ? (
          <InventoryEmptyState
            title="No stock for this SKU"
            description="Receive stock against a warehouse and bin to create a balance row."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Bin</th>
                    <th className="px-4 py-3">Lot / batch</th>
                    <th className="px-4 py-3">On hand</th>
                    <th className="px-4 py-3">Reserved</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {item.balances.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{b.warehouse.code}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.location.locationCode}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {b.lotNumber ?? "—"} / {b.batchNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {b.onHandQty} {item.uom}
                      </td>
                      <td className="px-4 py-3">{b.reservedQty}</td>
                      <td className="px-4 py-3 text-right">
                        <BalanceRowActions
                          balanceId={b.id}
                          locationId={b.locationId}
                          locationCode={b.location.locationCode}
                          onHandQty={b.onHandQty}
                          skuLabel={`${item.skuCode} @ ${b.location.locationCode}`}
                          locations={formOptions.locationsByWarehouse[b.warehouseId] ?? []}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Transaction history</h3>
        {txs.length === 0 ? (
          <InventoryEmptyState title="No transactions yet" description="Movements will appear here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Δ</th>
                    <th className="px-4 py-3">After</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {t.occurredAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">{t.transactionType}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {t.location?.locationCode ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {t.quantityDelta > 0 ? "+" : ""}
                        {t.quantityDelta}
                      </td>
                      <td className="px-4 py-3">{t.quantityAfter}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{t.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </section>
    </div>
  );
}
