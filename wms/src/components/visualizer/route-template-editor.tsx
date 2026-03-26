"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createRouteTemplateAction,
  deleteRouteTemplateAction,
} from "@/features/floor-plan/actions";
import type { FloorZone, RouteTemplate } from "@/features/floor-plan/types";

type Props = {
  warehouseId: string;
  zones: FloorZone[];
  routes: RouteTemplate[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
};

const inputCls =
  "w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200";

export function RouteTemplateEditor({
  warehouseId,
  zones,
  routes,
  selectedRouteId,
  onSelectRoute,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [sequence, setSequence] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  function addZone(zoneName: string) {
    if (zoneName && !sequence.includes(zoneName)) {
      setSequence([...sequence, zoneName]);
    }
  }

  function removeStep(idx: number) {
    setSequence(sequence.filter((_, i) => i !== idx));
  }

  function handleCreate() {
    if (!name.trim() || sequence.length < 2) {
      setMsg("Name and at least 2 zones required");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await createRouteTemplateAction({
        warehouseId,
        name: name.trim(),
        zoneSequence: sequence,
      });
      if (r.ok) {
        setName("");
        setSequence([]);
        setShowCreate(false);
        router.refresh();
      } else {
        setMsg(r.error ?? "Failed");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRouteTemplateAction({ id });
      if (selectedRouteId === id) onSelectRoute(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-300">
          Route Templates
        </h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancel" : "+ New route"}
        </Button>
      </div>

      {msg && (
        <p className="text-[10px] text-red-600 dark:text-red-400">{msg}</p>
      )}

      {showCreate && (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
          <input
            className={inputCls}
            placeholder="Route name (e.g. Inbound Flow)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Add zones in order
            </label>
            <select
              className={inputCls + " mt-1"}
              defaultValue=""
              onChange={(e) => {
                addZone(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Select zone…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>

          {sequence.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {sequence.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-[10px] text-slate-400">→</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-white/10 dark:text-gray-300">
                    {i + 1}. {s}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => removeStep(i)}
                    >
                      ×
                    </button>
                  </span>
                </span>
              ))}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            disabled={isPending || !name.trim() || sequence.length < 2}
            onClick={handleCreate}
          >
            {isPending ? "Creating…" : "Create route"}
          </Button>
        </div>
      )}

      {routes.length === 0 && !showCreate && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No route templates yet.
        </p>
      )}

      <div className="space-y-1.5">
        {routes.map((rt) => (
          <div
            key={rt.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition cursor-pointer ${
              selectedRouteId === rt.id
                ? "border-blue-400 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-navy-border dark:hover:bg-white/5"
            }`}
            onClick={() =>
              onSelectRoute(selectedRouteId === rt.id ? null : rt.id)
            }
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800 dark:text-gray-200">
                {rt.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                {rt.zoneSequence.join(" → ")}
              </p>
            </div>
            <button
              type="button"
              className="ml-2 text-slate-400 hover:text-red-500 dark:text-slate-500"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(rt.id);
              }}
              disabled={isPending}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
