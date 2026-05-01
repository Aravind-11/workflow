"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { WorkflowStage, PortDataType } from "@/lib/workflow/types";
import { PORT_COLORS } from "@/lib/workflow/types";
import {
  PackageOpen, ClipboardCheck, ArrowDownToLine, ClipboardList,
  Package, Pause, Send, RotateCcw, Puzzle, GripVertical, ScanBarcode,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PackageOpen, ClipboardCheck, ArrowDownToLine, ClipboardList,
  Package, Pause, Send, RotateCcw, Puzzle,
};

const COLOR_MAP: Record<string, string> = {
  emerald: "border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30",
  yellow: "border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/30",
  cyan: "border-cyan-500/60 bg-cyan-50 dark:bg-cyan-950/30",
  violet: "border-violet-500/60 bg-violet-50 dark:bg-violet-950/30",
  amber: "border-amber-500/60 bg-amber-50 dark:bg-amber-950/30",
  gray: "border-gray-400/60 bg-gray-50 dark:bg-gray-900/30",
  rose: "border-rose-500/60 bg-rose-50 dark:bg-rose-950/30",
  pink: "border-pink-500/60 bg-pink-50 dark:bg-pink-950/30",
  slate: "border-slate-400/60 bg-slate-50 dark:bg-slate-900/30",
  blue: "border-blue-500/60 bg-blue-50 dark:bg-blue-950/30",
};

const ICON_COLOR_MAP: Record<string, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  gray: "text-gray-500 dark:text-gray-400",
  rose: "text-rose-600 dark:text-rose-400",
  pink: "text-pink-600 dark:text-pink-400",
  slate: "text-slate-500 dark:text-slate-400",
  blue: "text-blue-600 dark:text-blue-400",
};

function portColor(dataType: PortDataType): string {
  return PORT_COLORS[dataType] ?? "bg-gray-400";
}

function StageNodeComponent({ data: rawData, selected }: NodeProps) {
  const data = rawData as unknown as WorkflowStage;
  const Icon = ICON_MAP[data.icon ?? "Puzzle"] ?? Puzzle;
  const colorClass = COLOR_MAP[data.color ?? "slate"] ?? COLOR_MAP.slate;
  const iconColor = ICON_COLOR_MAP[data.color ?? "slate"] ?? ICON_COLOR_MAP.slate;

  const maxPorts = Math.max(data.inputs.length, data.outputs.length);

  return (
    <div
      className={cn(
        "stage-node relative min-w-[200px] rounded-xl border-2 shadow-md transition-shadow",
        colorClass,
        selected && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 shadow-lg",
      )}
    >
      {/* Node header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0 cursor-grab" />
        <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {data.label}
            </span>
            {(data.behavior?.generateBarcode ?? true) && (
              <span
                title={
                  data.behavior?.barcodeConfirmed
                    ? `Barcode confirmed: ${data.behavior.barcodePrefix || data.label.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4)}`
                    : "Barcode enabled (not yet confirmed)"
                }
                className="relative shrink-0"
              >
                <ScanBarcode className={cn(
                  "h-3.5 w-3.5",
                  data.behavior?.barcodeConfirmed
                    ? "text-green-500 dark:text-green-400"
                    : "text-blue-400 dark:text-blue-500 opacity-60",
                )} />
                {data.behavior?.barcodeConfirmed && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-green-500">
                    <span className="h-1.5 w-1.5 text-white text-[6px] leading-none font-bold">✓</span>
                  </span>
                )}
              </span>
            )}
          </div>
          {data.entityBinding && (
            <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">
              {data.entityBinding}
            </div>
          )}
        </div>
      </div>

      {/* Port rows — handles are placed inline so React Flow measures real positions */}
      {maxPorts > 0 && (
        <div className="border-t border-gray-200/60 dark:border-white/10 px-1 py-1.5">
          {Array.from({ length: maxPorts }).map((_, rowIdx) => {
            const inp = data.inputs[rowIdx];
            const out = data.outputs[rowIdx];

            return (
              <div key={rowIdx} className="relative flex items-center justify-between min-h-[28px]">
                {/* Left (input) side */}
                <div className="flex items-center gap-1.5 pl-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {inp && (
                    <>
                      <Handle
                        type="target"
                        position={Position.Left}
                        id={inp.id}
                        className={cn("wf-handle wf-handle-target", portColor(inp.dataType))}
                        title={`Connect → ${inp.label} (${inp.dataType})`}
                      />
                      <span className={cn("inline-block h-2 w-2 rounded-full ring-1 ring-white dark:ring-gray-800 shrink-0", portColor(inp.dataType))} />
                      <span className="truncate max-w-[70px]">{inp.label}</span>
                    </>
                  )}
                </div>

                {/* Right (output) side */}
                <div className="flex items-center gap-1.5 pr-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {out && (
                    <>
                      <span className="truncate max-w-[70px]">{out.label}</span>
                      <span className={cn("inline-block h-2 w-2 rounded-full ring-1 ring-white dark:ring-gray-800 shrink-0", portColor(out.dataType))} />
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={out.id}
                        className={cn("wf-handle wf-handle-source", portColor(out.dataType))}
                        title={`Drag to connect → ${out.label} (${out.dataType})`}
                      />
                    </>
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

export const StageNode = memo(StageNodeComponent);
export const NODE_TYPES = { stage: StageNode } as const;
