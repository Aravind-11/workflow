"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { receiveStockAction } from "../actions";
import { receiveStockSchema, type ReceiveStockInput } from "../schemas";

type Warehouse = { id: string; code: string; name: string };
type Loc = { id: string; warehouseId: string; locationCode: string };
type Item = { id: string; skuCode: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  locationsByWarehouse: Record<string, Loc[]>;
  items: Item[];
  defaultInventoryItemId?: string;
};

export function ReceiveStockModal({
  open,
  onClose,
  warehouses,
  locationsByWarehouse,
  items,
  defaultInventoryItemId,
}: Props) {
  const [itemQuery, setItemQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ReceiveStockInput>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: {
      warehouseId: warehouses[0]?.id ?? "",
      locationId: "",
      inventoryItemId: defaultInventoryItemId ?? "",
      quantity: 1,
      lotNumber: "",
      batchNumber: "",
      expiryDate: "",
    },
  });

  useEffect(() => {
    if (open && defaultInventoryItemId) {
      form.setValue("inventoryItemId", defaultInventoryItemId);
    }
  }, [open, defaultInventoryItemId, form]);

  const warehouseId = form.watch("warehouseId");
  const locations = useMemo(
    () => locationsByWarehouse[warehouseId] ?? [],
    [locationsByWarehouse, warehouseId],
  );

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 80);
    return items
      .filter(
        (i) =>
          i.skuCode.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [items, itemQuery]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await receiveStockAction({
      ...values,
      lotNumber: values.lotNumber || null,
      batchNumber: values.batchNumber || null,
      expiryDate: values.expiryDate || null,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    onClose();
  });

  return (
    <Modal open={open} title="Receive stock" onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <label className="block text-sm">
          <span className="text-gray-600">Warehouse</span>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("warehouseId", {
              onChange: () => form.setValue("locationId", ""),
            })}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-gray-600">Putaway location</span>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("locationId")}
          >
            <option value="">Select bin</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationCode}
              </option>
            ))}
          </select>
        </label>

        <div>
          <label className="text-sm text-gray-600">SKU</label>
          <input
            type="search"
            placeholder="Filter SKUs…"
            className="mb-2 mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={itemQuery}
            onChange={(e) => setItemQuery(e.target.value)}
            autoComplete="off"
            data-scan-target="sku-search"
          />
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            {...form.register("inventoryItemId")}
          >
            <option value="">Select SKU</option>
            {filteredItems.map((i) => (
              <option key={i.id} value={i.id}>
                {i.skuCode} — {i.name}
              </option>
            ))}
          </select>
        </div>

        <label className="block text-sm">
          <span className="text-gray-600">Quantity ({/* UOM shown on item detail */}units)</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("quantity", { valueAsNumber: true })}
          />
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-gray-600">Lot #</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              {...form.register("lotNumber")}
              data-scan-target="lot"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Batch #</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              {...form.register("batchNumber")}
              data-scan-target="batch"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-gray-600">Expiry (ISO)</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("expiryDate")}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Receive"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
