"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { adjustStockAction } from "../actions";
import { adjustStockSchema, type AdjustStockInput } from "../schemas";

type Props = {
  open: boolean;
  onClose: () => void;
  balanceId: string;
  skuLabel: string;
  currentOnHand: number;
};

export function AdjustStockModal({
  open,
  onClose,
  balanceId,
  skuLabel,
  currentOnHand,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: {
      balanceId,
      quantityDelta: 0,
      reason: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await adjustStockAction({ ...values, balanceId });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset({ balanceId, quantityDelta: 0, reason: "" });
    onClose();
  });

  return (
    <Modal open={open} title="Adjust on-hand quantity" onClose={onClose}>
      <p className="mb-2 text-sm text-gray-600">
        <span className="font-medium">{skuLabel}</span> · current on-hand{" "}
        <span className="font-mono">{currentOnHand}</span>
      </p>
      <p className="mb-3 text-xs text-gray-500">
        Use negative values to decrease. A reason is required and is written to the audit log.
      </p>
      <form className="space-y-3" onSubmit={onSubmit}>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
        <input type="hidden" {...form.register("balanceId")} value={balanceId} />
        <label className="block text-sm">
          <span className="text-gray-600">Quantity change</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("quantityDelta", { valueAsNumber: true })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Reason</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. Cycle count variance, damage write-off…"
            {...form.register("reason")}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Apply adjustment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
