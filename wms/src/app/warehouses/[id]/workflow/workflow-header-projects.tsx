"use client";

import { useTransition } from "react";
import { switchProjectAction } from "@/features/warehouses/actions";

export function WorkflowDesignerHeaderProjects({
  projects,
  selectedProjectId,
}: {
  projects: { id: string; code: string; name: string }[];
  selectedProjectId: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-white/10 dark:bg-gray-900/80">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Project
      </span>
      <select
        value={selectedProjectId}
        disabled={pending}
        onChange={(e) => {
          start(() => switchProjectAction(e.target.value));
        }}
        className="max-w-xs rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} — {p.name}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-gray-500 dark:text-gray-400">
        Workflows are listed per project. Switch project to edit a different set.
      </span>
    </div>
  );
}
