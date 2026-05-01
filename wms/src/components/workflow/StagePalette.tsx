"use client";

import { cn } from "@/lib/utils";
import { getAllStageTemplates } from "@/lib/workflow/registry";
import type { BuiltInStageType } from "@/lib/workflow/types";
import {
  PackageOpen, ClipboardCheck, ArrowDownToLine, ClipboardList,
  Package, Pause, Send, RotateCcw, Puzzle,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PackageOpen, ClipboardCheck, ArrowDownToLine, ClipboardList,
  Package, Pause, Send, RotateCcw, Puzzle,
};

const COLOR_BG: Record<string, string> = {
  emerald: "bg-emerald-100 dark:bg-emerald-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
  cyan: "bg-cyan-100 dark:bg-cyan-900/30",
  violet: "bg-violet-100 dark:bg-violet-900/30",
  amber: "bg-amber-100 dark:bg-amber-900/30",
  gray: "bg-gray-100 dark:bg-gray-800/30",
  rose: "bg-rose-100 dark:bg-rose-900/30",
  pink: "bg-pink-100 dark:bg-pink-900/30",
  slate: "bg-slate-100 dark:bg-slate-800/30",
};

const COLOR_TEXT: Record<string, string> = {
  emerald: "text-emerald-700 dark:text-emerald-300",
  yellow: "text-yellow-700 dark:text-yellow-300",
  cyan: "text-cyan-700 dark:text-cyan-300",
  violet: "text-violet-700 dark:text-violet-300",
  amber: "text-amber-700 dark:text-amber-300",
  gray: "text-gray-600 dark:text-gray-300",
  rose: "text-rose-700 dark:text-rose-300",
  pink: "text-pink-700 dark:text-pink-300",
  slate: "text-slate-600 dark:text-slate-300",
};

export function StagePalette() {
  const templates = getAllStageTemplates();

  const onDragStart = (event: React.DragEvent, stageType: BuiltInStageType) => {
    event.dataTransfer.setData("application/workflow-stage-type", stageType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Stage Types
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {templates.map(({ type, template }) => {
          const Icon = ICON_MAP[template.icon ?? "Puzzle"] ?? Puzzle;
          const bg = COLOR_BG[template.color ?? "slate"] ?? COLOR_BG.slate;
          const text = COLOR_TEXT[template.color ?? "slate"] ?? COLOR_TEXT.slate;

          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => onDragStart(e, type)}
              className={cn(
                "flex cursor-grab items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
                "hover:bg-gray-100 dark:hover:bg-white/5",
                "active:cursor-grabbing",
              )}
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", bg)}>
                <Icon className={cn("h-4 w-4", text)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {template.label}
                </div>
                <div className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                  {template.inputs.length}in / {template.outputs.length}out
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-200 px-4 py-2.5 dark:border-white/10">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Drag a stage onto the canvas to add it
        </p>
      </div>
    </div>
  );
}
