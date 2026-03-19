"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SkuFormModal } from "./sku-form-modal";

export function CatalogToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Add SKU
      </Button>
      <SkuFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
