"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { upsertInventoryItemAction } from "../actions";
import { upsertSkuSchema, type UpsertSkuInput } from "../schemas";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<UpsertSkuInput> & { id?: string };
};

export function SkuFormModal({ open, onClose, initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpsertSkuInput>({
    resolver: zodResolver(upsertSkuSchema),
    defaultValues: {
      skuCode: "",
      barcode: "",
      name: "",
      description: "",
      category: "",
      uom: "EA",
      reorderPoint: undefined,
      lotTracked: true,
      batchTracked: true,
      expiryTracked: false,
    },
  });

  useEffect(() => {
    if (initial && open) {
      form.reset({
        id: initial.id,
        skuCode: initial.skuCode ?? "",
        barcode: initial.barcode ?? "",
        name: initial.name ?? "",
        description: initial.description ?? "",
        category: initial.category ?? "",
        uom: initial.uom ?? "EA",
        reorderPoint: initial.reorderPoint ?? undefined,
        lotTracked: initial.lotTracked ?? true,
        batchTracked: initial.batchTracked ?? true,
        expiryTracked: initial.expiryTracked ?? false,
      });
    }
  }, [initial, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await upsertInventoryItemAction(values);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  });

  return (
    <Modal
      open={open}
      title={initial?.id ? "Edit SKU" : "Add SKU"}
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={onSubmit}>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
        {initial?.id ? <input type="hidden" {...form.register("id")} /> : null}

        <label className="block text-sm">
          <span className="text-gray-600">SKU code</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            {...form.register("skuCode")}
            data-scan-target="sku-code"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Barcode</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
            {...form.register("barcode")}
            data-scan-target="barcode"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Name</span>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...form.register("name")} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Category</span>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...form.register("category")} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">UOM</span>
          <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" {...form.register("uom")} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Reorder point</span>
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("reorderPoint", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return null;
                const n = typeof v === "string" ? Number(v) : Number(v);
                if (!Number.isFinite(n)) return null;
                return Math.trunc(n);
              },
            })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("lotTracked")} />
          Lot tracked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("batchTracked")} />
          Batch tracked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...form.register("expiryTracked")} />
          Expiry tracked
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
