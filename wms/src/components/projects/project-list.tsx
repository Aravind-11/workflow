"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "@/features/projects/actions";

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  customerName: string;
  status: string;
  warehouse: { id: string; code: string; name: string };
  _count: { workflows: number; trackingItems: number };
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProjectListClient({
  projects,
  warehouses,
}: {
  projects: ProjectRow[];
  warehouses: WarehouseOption[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const warehouseId = fd.get("warehouseId") as string;
    const goToWorkflow = fd.get("createWorkflow") === "on";
    startTransition(async () => {
      const result = await createProjectAction({
        warehouseId,
        code: (fd.get("code") as string).trim(),
        name: (fd.get("name") as string).trim(),
        customerName: (fd.get("customerName") as string).trim(),
        contactEmail: (fd.get("contactEmail") as string) || undefined,
        contactPhone: (fd.get("contactPhone") as string) || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      // Drop the user straight into the Workflow Designer scoped to the new
      // project so they can wire up stages immediately. The designer creates
      // the WorkflowTemplate row on first save.
      const newId = result.data?.id;
      if (goToWorkflow && newId) {
        router.push(
          `/warehouses/${warehouseId}/workflow?projectId=${newId}`,
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-y border-slate-200/60 py-3 dark:border-white/[0.06]">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="group inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-white transition-transform duration-200 hover:-translate-y-0.5 dark:bg-white dark:text-slate-900"
        >
          <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-b border-slate-200/60 pb-6 dark:border-white/[0.06]">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <Field label="Warehouse">
                  <select name="warehouseId" required className={inputClass}>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Project code">
                  <input
                    name="code"
                    required
                    placeholder="LACBJP"
                    className={inputClass}
                  />
                </Field>
                <Field label="Project name">
                  <input
                    name="name"
                    required
                    placeholder="LA County BJP"
                    className={inputClass}
                  />
                </Field>
                <Field label="Customer name">
                  <input name="customerName" required className={inputClass} />
                </Field>
                <Field label="Contact email">
                  <input
                    name="contactEmail"
                    type="email"
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact phone">
                  <input name="contactPhone" className={inputClass} />
                </Field>
              </div>
              {error && (
                <p className="text-[12.5px] text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex select-none items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name="createWorkflow"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-400 dark:border-white/20 dark:bg-white/[0.04] dark:text-white"
                  />
                  Open Workflow Designer after saving
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Creating…" : "Create project"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {projects.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center border-y border-slate-200/60 px-6 py-20 text-center dark:border-white/[0.06]">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            No projects yet
          </p>
          <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
            Click <span className="font-medium">New project</span> above to spin
            one up.
          </p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-[1] bg-white/80 backdrop-blur dark:bg-navy/80">
              <tr>
                <Th className="text-left">Code</Th>
                <Th className="text-left">Name</Th>
                <Th className="text-left">Customer</Th>
                <Th className="text-left">Warehouse</Th>
                <Th className="text-right">Workflows</Th>
                <Th className="text-right">Items</Th>
                <Th className="text-left">Status</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="group transition-colors duration-200 hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                >
                  <Td>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-slate-700 transition-colors group-hover:text-slate-950 dark:text-slate-300 dark:group-hover:text-gray-50"
                    >
                      {p.code}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-gray-100"
                    >
                      {p.name}
                    </Link>
                  </Td>
                  <Td className="text-[13px] text-slate-700 dark:text-slate-300">
                    {p.customerName}
                  </Td>
                  <Td className="font-mono text-[12px] uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
                    {p.warehouse.code}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/warehouses/${p.warehouse.id}/workflow?projectId=${p.id}`}
                      className="group/wf inline-flex items-center justify-end gap-1.5 font-mono text-[12px] tabular-nums text-slate-700 transition-colors hover:text-slate-950 dark:text-gray-200 dark:hover:text-gray-50"
                      title={
                        p._count.workflows > 0
                          ? "Open workflow designer"
                          : "Create a workflow for this project"
                      }
                    >
                      <span className="tabular-nums">{p._count.workflows}</span>
                      <Workflow className="h-3 w-3 opacity-0 transition-opacity duration-150 group-hover/wf:opacity-70" />
                    </Link>
                  </Td>
                  <Td className="text-right font-mono text-[13px] tabular-nums text-slate-700 dark:text-gray-200">
                    {p._count.trackingItems}
                  </Td>
                  <Td>
                    <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>
                      {p.status}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-slate-200/70 bg-white px-3 text-[13px] text-slate-800 outline-none transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.16] dark:focus:border-white/[0.24] dark:focus:ring-white/[0.06]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200/60 px-3 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:border-white/[0.06] dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-slate-200/40 px-3 py-3 align-middle dark:border-white/[0.04] ${className}`}
    >
      {children}
    </td>
  );
}
