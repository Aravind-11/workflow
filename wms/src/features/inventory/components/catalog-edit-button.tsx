"use client";

import { useState } from "react";
import { SkuFormModal } from "./sku-form-modal";
import type { InventoryItem } from "@prisma/client";

type Props = { item: InventoryItem };

export function CatalogEditButton({ item }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-sm font-medium text-blue-700 hover:underline"
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
      <SkuFormModal
        open={open}
        onClose={() => setOpen(false)}
        initial={{
          id: item.id,
          skuCode: item.skuCode,
          barcode: item.barcode,
          name: item.name,
          description: item.description,
          category: item.category,
          uom: item.uom,
          reorderPoint: item.reorderPoint ?? undefined,
          lotTracked: item.lotTracked,
          batchTracked: item.batchTracked,
          expiryTracked: item.expiryTracked,
        }}
      />
    </>
  );
}
