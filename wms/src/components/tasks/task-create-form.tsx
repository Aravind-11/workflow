"use client";

import { TaskType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createTaskAction } from "@/features/tasks/actions";

const TASK_TYPES: TaskType[] = [
  "RECEIPT",
  "PUTAWAY",
  "PICK",
  "PACK",
  "SHIPMENT",
  "RETURN",
  "CYCLE_COUNT",
  "MAINTENANCE",
];

export function TaskCreateForm({
  warehouses,
}: {
  warehouses: { id: string; code: string; name: string }[];
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    warehouseId: warehouses[0]?.id ?? "",
    title: "",
    taskType: "PUTAWAY" as TaskType,
    priority: 3,
    dueDate: "",
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const r = await createTaskAction({
      warehouseId: form.warehouseId,
      title: form.title,
      taskType: form.taskType,
      priority: form.priority,
      dueDate: form.dueDate || null,
    });
    setPending(false);
    if (!r.ok) setErr(r.error);
    else {
      setForm((f) => ({ ...f, title: "", dueDate: "" }));
      router.refresh();
    }
  }

  if (warehouses.length === 0) {
    return <p className="text-sm text-amber-800">Add a warehouse before creating tasks.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Create task</h3>
      {err ? <p className="text-xs text-red-700">{err}</p> : null}
      <label className="block text-xs font-medium text-slate-600">
        Warehouse
        <select
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={form.warehouseId}
          onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-slate-600">
        Title
        <input
          required
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Cycle count zone A-12"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-600">
          Type
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={form.taskType}
            onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value as TaskType }))}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Priority (1 = highest)
          <input
            type="number"
            min={1}
            max={5}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 3 }))}
          />
        </label>
      </div>
      <label className="block text-xs font-medium text-slate-600">
        Due (optional)
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={form.dueDate}
          onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
        />
      </label>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Create task"}
      </Button>
    </form>
  );
}
