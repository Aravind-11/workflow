const LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  CREATED: "Created",
  PICKED: "Picked",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DRAFT: "Draft",
  RECEIVED: "Received",
  POSTED: "Posted",
  PLANNED: "Planned",
  ASSIGNED: "Assigned",
};

const COLORS: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  CANCELLED: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
  CREATED: "bg-slate-100/80 text-slate-700 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10",
  PICKED: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25",
  PACKED: "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/25",
  SHIPPED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  DRAFT: "bg-slate-100/80 text-slate-600 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/10",
  RECEIVED: "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/25",
  POSTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  PLANNED: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/25",
  ASSIGNED: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
};

const DEFAULT =
  "bg-slate-100/80 text-slate-600 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/10";

export function StatusBadge({ status }: { status: string }) {
  const label = LABELS[status] ?? status;
  const color = COLORS[status] ?? DEFAULT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${color}`}>
      {label}
    </span>
  );
}
