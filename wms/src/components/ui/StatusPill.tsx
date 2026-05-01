const styles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
  open: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
  shipped: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
  damaged: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
};

const DEFAULT =
  "bg-slate-100/80 text-slate-600 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10";

export default function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ring-1 ring-inset ${
        styles[status] ?? DEFAULT
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
