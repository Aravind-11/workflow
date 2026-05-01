"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, GitBranch, ChevronRight, ScanBarcode } from "lucide-react";
import { createProjectAction } from "@/features/projects/actions";

interface ProjectWorkflow {
  id: string;
  name: string;
  isActive: boolean;
  version: number;
}

interface ProjectRow {
  id: string;
  code: string;
  name: string;
  customerName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  workflows: ProjectWorkflow[];
  trackingCount: number;
}

interface Props {
  warehouseId: string;
  warehouseCode: string;
  projects: ProjectRow[];
}

export function WarehouseProjectsSection({ warehouseId, warehouseCode, projects }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
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
      } else {
        setShowForm(false);
      }
    });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-navy-border">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Projects</h2>
          <span className="text-xs text-gray-400">({projects.length})</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Project
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-b border-gray-100 px-5 py-4 dark:border-navy-border space-y-3"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project Code</label>
              <input
                name="code"
                required
                placeholder="e.g. LACBJP"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project Name</label>
              <input
                name="name"
                required
                placeholder="e.g. LA County BJP"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Customer Name</label>
              <input
                name="customerName"
                required
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input
                name="contactEmail"
                type="email"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
              <input
                name="contactPhone"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="py-10 text-center text-sm text-gray-400">
          No projects yet. Create one to start building workflows for specific customers.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-navy-border">
          {projects.map((p) => {
            const activeWf = p.workflows.find((w) => w.isActive);
            return (
              <div key={p.id} className="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
                      <span className="font-mono text-xs text-gray-400">{p.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.status === "ACTIVE"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      Customer: {p.customerName}
                      {p.contactEmail && ` · ${p.contactEmail}`}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {p.workflows.length} workflow{p.workflows.length !== 1 ? "s" : ""}
                        {activeWf && (
                          <span className="text-green-600 dark:text-green-400">
                            ({activeWf.name} active)
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <ScanBarcode className="h-3 w-3" />
                        {p.trackingCount} tracked item{p.trackingCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/warehouses/${warehouseId}/workflow?projectId=${p.id}`}
                    className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 shrink-0"
                  >
                    <GitBranch className="h-3 w-3" />
                    Workflow
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
