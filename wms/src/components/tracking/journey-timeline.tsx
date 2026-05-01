"use client";

import { cn } from "@/lib/utils";
import { BarcodeLabel } from "./barcode-label";
import {
  PackageOpen, ClipboardCheck, Package, Send, ArrowDownToLine,
  Clock, MapPin, User, ExternalLink, Box, Layers,
} from "lucide-react";
import Link from "next/link";

interface LinkedEntity {
  receipt?: { id: string; receiptNumber: string; status: string } | null;
  pickList?: { id: string; pickListNumber: string; status: string } | null;
  packList?: { id: string; packListNumber: string; status: string } | null;
  shipment?: { id: string; shipmentNumber: string; status: string; trackingNumber?: string | null } | null;
  task?: { id: string; title: string; status: string } | null;
  workerProfile?: { id: string; firstName: string; lastName: string } | null;
  location?: { id: string; locationCode: string; zone: string; aisle?: string; rack?: string; bin?: string } | null;
}

export interface TimelineEvent extends LinkedEntity {
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
  containerType?: string | null;
  containerBarcode?: string | null;
}

interface ContainedItem {
  id: string;
  barcode: string;
  skuCode: string;
  description: string | null;
  containerType: string | null;
}

interface Props {
  item: TrackingItemInfo;
  events: TimelineEvent[];
  containedItems?: ContainedItem[];
}

const STAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  receive: PackageOpen,
  qc: ClipboardCheck,
  putaway: ArrowDownToLine,
  pick: ClipboardCheck,
  pack: Package,
  ship: Send,
  create: Box,
  attach: Layers,
  detach: Layers,
};

const STAGE_DOT_COLORS: Record<string, string> = {
  receive: "bg-emerald-500",
  qc: "bg-teal-500",
  putaway: "bg-cyan-500",
  pick: "bg-violet-500",
  pack: "bg-amber-500",
  ship: "bg-rose-500",
  create: "bg-blue-500",
  attach: "bg-indigo-500",
  detach: "bg-gray-500",
};

const STAGE_BG: Record<string, string> = {
  receive: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  qc: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800",
  putaway: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
  pick: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
  pack: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  ship: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800",
  create: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  attach: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800",
  detach: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800",
};

function formatDwell(ms: number): string {
  if (ms < 60_000) return "< 1m";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return remainMin > 0 ? `${hours}h ${remainMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainHrs = hours % 24;
  return remainHrs > 0 ? `${days}d ${remainHrs}h` : `${days}d`;
}

function EntityLinkCard({ event }: { event: TimelineEvent }) {
  const links: { label: string; value: string; href: string }[] = [];

  if (event.receipt) {
    links.push({
      label: "Receipt",
      value: event.receipt.receiptNumber,
      href: `/receiving/receipts/${event.receipt.id}`,
    });
  }
  if (event.pickList) {
    links.push({
      label: "Pick List",
      value: event.pickList.pickListNumber,
      href: `/picking/${event.pickList.id}`,
    });
  }
  if (event.packList) {
    links.push({
      label: "Pack List",
      value: event.packList.packListNumber,
      href: `/packing/${event.packList.id}`,
    });
  }
  if (event.shipment) {
    links.push({
      label: "Shipment",
      value: event.shipment.shipmentNumber,
      href: `/shipping/${event.shipment.id}`,
    });
  }
  if (event.task) {
    links.push({
      label: "Task",
      value: event.task.title,
      href: `/tasks`,
    });
  }

  if (links.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-50 dark:bg-gray-800/80 dark:text-blue-300 dark:ring-blue-800 dark:hover:bg-blue-900/30"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {l.label}: {l.value}
        </Link>
      ))}
    </div>
  );
}

function TimelineNode({
  event,
  item,
  dwellMs,
  isLast,
}: {
  event: TimelineEvent;
  item: TrackingItemInfo;
  dwellMs: number | null;
  isLast: boolean;
}) {
  const Icon = STAGE_ICONS[event.stageType] ?? PackageOpen;
  const dotColor = STAGE_DOT_COLORS[event.stageType] ?? "bg-gray-400";
  const bgColor = STAGE_BG[event.stageType] ?? "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800";
  const workerName = event.workerProfile
    ? `${event.workerProfile.firstName} ${event.workerProfile.lastName}`
    : event.handledBy;
  const locationLabel = event.location
    ? event.location.locationCode
    : event.locationCode;

  return (
    <div className="relative flex gap-4">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn("h-4 w-4 rounded-full ring-2 ring-white dark:ring-gray-950 shrink-0 z-10", dotColor)} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />}
      </div>

      {/* Content card */}
      <div className={cn("mb-4 flex-1 rounded-lg border p-3", bgColor)}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {event.stageLabel}
          </span>
          <span className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">
            {new Date(event.timestamp).toLocaleString()}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          {workerName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {workerName}
            </div>
          )}
          {locationLabel && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationLabel}
              {event.warehouseZone && ` (${event.warehouseZone})`}
            </div>
          )}
          {event.notes && (
            <div className="col-span-2 text-gray-500 dark:text-gray-400 italic">
              {event.notes}
            </div>
          )}
        </div>

        <EntityLinkCard event={event} />

        <div className="mt-2">
          <BarcodeLabel barcode={event.barcode} compact format="qr" />
        </div>

        {dwellMs !== null && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Dwell: {formatDwell(dwellMs)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ContainerContentsSection({ items }: { items: ContainedItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        <Layers className="h-4 w-4" />
        Container Contents ({items.length} items)
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((ci) => (
          <Link
            key={ci.id}
            href={`/tracking?code=${encodeURIComponent(ci.barcode)}`}
            className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-2.5 text-xs transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600"
          >
            {ci.containerType ? (
              <Box className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <Package className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-mono font-medium text-gray-900 dark:text-gray-100 truncate">
                {ci.barcode}
              </div>
              <div className="text-gray-500 dark:text-gray-400 truncate">
                {ci.skuCode}{ci.description && ` — ${ci.description}`}
              </div>
            </div>
            {ci.containerType && (
              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {ci.containerType}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function JourneyTimeline({ item, events, containedItems }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-8">
        No tracking events recorded yet.
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const dwellTimes: (number | null)[] = sorted.map((evt, i) => {
    if (i === sorted.length - 1) return null;
    const current = new Date(evt.timestamp).getTime();
    const next = new Date(sorted[i + 1].timestamp).getTime();
    return next - current;
  });

  return (
    <div className="space-y-6">
      {item.containerType && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/30">
          <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-200">
            {item.containerType} Container
          </span>
          {item.containerBarcode && (
            <span className="text-blue-600 dark:text-blue-400">
              → Parent: <code className="font-mono">{item.containerBarcode}</code>
            </span>
          )}
        </div>
      )}

      {containedItems && containedItems.length > 0 && (
        <ContainerContentsSection items={containedItems} />
      )}

      <div className="pl-2">
        {sorted.map((event, i) => (
          <TimelineNode
            key={event.id}
            event={event}
            item={item}
            dwellMs={dwellTimes[i]}
            isLast={i === sorted.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
