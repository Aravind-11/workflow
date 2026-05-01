"use client";

import { cn } from "@/lib/utils";
import { BarcodeLabel } from "./barcode-label";
import {
  PackageOpen, ClipboardCheck, Package, Send, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface TrackingEvent {
  id: string;
  parentEventId: string | null;
  stageType: string;
  stageLabel: string;
  barcode: string;
  handledBy: string | null;
  locationCode: string | null;
  warehouseZone: string | null;
  notes: string | null;
  timestamp: string | Date;
}

interface TrackingItemInfo {
  barcode: string;
  skuCode: string;
  description: string | null;
  customerName: string | null;
  providerName: string | null;
}

interface Props {
  item: TrackingItemInfo;
  events: TrackingEvent[];
}

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  receive: PackageOpen,
  pick: ClipboardCheck,
  pack: Package,
  ship: Send,
};

const STAGE_COLORS: Record<string, string> = {
  receive: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  pick: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
  pack: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  ship: "border-rose-500 bg-rose-50 dark:bg-rose-950/30",
};

interface TreeNode extends TrackingEvent {
  children: TreeNode[];
}

function buildTree(events: TrackingEvent[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const e of events) {
    map.set(e.id, { ...e, children: [] });
  }
  for (const node of map.values()) {
    if (node.parentEventId && map.has(node.parentEventId)) {
      map.get(node.parentEventId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function TreeNodeView({ node, item, depth }: { node: TreeNode; item: TrackingItemInfo; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = STAGE_ICONS[node.stageType] ?? PackageOpen;
  const colorClass = STAGE_COLORS[node.stageType] ?? "border-gray-400 bg-gray-50 dark:bg-gray-900/30";

  return (
    <div className={cn("relative", depth > 0 && "ml-8")}>
      {depth > 0 && (
        <div className="absolute -left-4 top-0 h-full w-px bg-gray-300 dark:bg-gray-700" />
      )}
      {depth > 0 && (
        <div className="absolute -left-4 top-6 h-px w-4 bg-gray-300 dark:bg-gray-700" />
      )}

      <div className={cn("rounded-lg border-2 p-3 mb-3", colorClass)}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-black/5 rounded dark:hover:bg-white/10"
          >
            {node.children.length > 0 ? (
              expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4" />
            )}
          </button>
          <Icon className="h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {node.stageLabel}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2">
              {new Date(node.timestamp).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">Customer: </span>
            {item.customerName ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">Handler: </span>
            {node.handledBy ?? "—"}
          </div>
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">Location: </span>
            {node.locationCode ?? "—"}
            {node.warehouseZone && ` (${node.warehouseZone})`}
          </div>
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">Item: </span>
            {item.skuCode}
            {item.description && ` — ${item.description}`}
          </div>
          {node.notes && (
            <div className="col-span-2">
              <span className="font-medium text-gray-800 dark:text-gray-200">Notes: </span>
              {node.notes}
            </div>
          )}
        </div>

        <div className="mt-2">
          <BarcodeLabel barcode={node.barcode} compact />
        </div>
      </div>

      {expanded && node.children.map((child) => (
        <TreeNodeView key={child.id} node={child} item={item} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TrackingTree({ item, events }: Props) {
  const roots = buildTree(events);

  if (roots.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-8">
        No tracking events recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roots.map((root) => (
        <TreeNodeView key={root.id} node={root} item={item} depth={0} />
      ))}
    </div>
  );
}
