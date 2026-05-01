"use client";

import { useState, useTransition } from "react";
import { importFromLibrary } from "@/features/workflow/blueprint-actions";
import { GitBranch, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  version: number;
  stages: unknown[];
  createdAt: string;
}

interface Props {
  blueprints: Blueprint[];
  warehouseId: string | null;
  projectId: string | null;
}

export function BlueprintLibrary({ blueprints, warehouseId, projectId }: Props) {
  const [filter, setFilter] = useState("");
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const categories = Array.from(
    new Set(blueprints.map((b) => b.category).filter(Boolean)),
  ) as string[];

  const filtered = blueprints.filter((b) => {
    if (!filter) return true;
    return (
      b.name.toLowerCase().includes(filter.toLowerCase()) ||
      b.category?.toLowerCase().includes(filter.toLowerCase()) ||
      b.description?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  function handleImport(blueprintId: string) {
    if (!warehouseId) return;
    startTransition(async () => {
      const res = await importFromLibrary(
        blueprintId,
        warehouseId,
        projectId ?? undefined,
      );
      if (res.ok) {
        setImportedIds((prev) => new Set(prev).add(blueprintId));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search blueprints…"
          className="w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-navy-border dark:bg-navy dark:text-gray-200"
        />
        {categories.length > 0 && (
          <div className="flex gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-navy-border dark:bg-navy-surface">
          <GitBranch className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {blueprints.length === 0
              ? "No blueprints published yet. Publish a workflow from the designer."
              : "No blueprints match your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bp) => {
            const stageCount = Array.isArray(bp.stages) ? bp.stages.length : 0;
            const imported = importedIds.has(bp.id);

            return (
              <div
                key={bp.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-navy-border dark:bg-navy-surface"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {bp.name}
                    </h3>
                    {bp.category && (
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                        {bp.category}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">v{bp.version}</span>
                </div>

                {bp.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {bp.description}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {stageCount} stage{stageCount !== 1 ? "s" : ""}
                  </span>

                  {warehouseId ? (
                    imported ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                        <Check className="h-3.5 w-3.5" /> Imported
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleImport(bp.id)}
                        disabled={isPending}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Import
                      </Button>
                    )
                  ) : (
                    <span className="text-[10px] text-gray-400">
                      Select warehouse to import
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
