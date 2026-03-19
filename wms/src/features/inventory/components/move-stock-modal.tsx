"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { moveStockAction } from "../actions";
import { moveStockSchema, type MoveStockInput } from "../schemas";

type Loc = { id: string; locationCode: string };

type Props = {
  open: boolean;
  onClose: () => void;
  balanceId: string;
  fromLabel: string;
  maxQty: number;
  locations: Loc[];
  currentLocationId: string;
};

export function MoveStockModal({
  open,
  onClose,
  balanceId,
  fromLabel,
  maxQty,
  locations,
  currentLocationId,
}: Props) {
  const form = useForm<MoveStockInput>({
    resolver: zodResolver(moveStockSchema),
    defaultValues: {
      balanceId,
      toLocationId: "",
      quantity: 1,
    },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destOptions = locations.filter((l) => l.id !== currentLocationId);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const res = await moveStockAction({ ...values, balanceId });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    form.reset();
    onClose();
  });

  return (
    <Modal open={open} title="Move stock" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-600">
        From <span className="font-mono font-medium">{fromLabel}</span> · available{" "}
        <span className="font-medium">{maxQty}</span>
      </p>
      <form className="space-y-3" onSubmit={onSubmit}>
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}
        <input type="hidden" {...form.register("balanceId")} value={balanceId} />
        <label className="block text-sm">
          <span className="text-gray-600">Destination bin</span>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("toLocationId")}
          >
            <option value="">Select location</option>
            {destOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.locationCode}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Quantity</span>
          <input
            type="number"
            min={1}
            max={maxQty}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register("quantity", { valueAsNumber: true })}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Moving…" : "Move"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
