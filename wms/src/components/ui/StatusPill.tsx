const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  open: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  shipped: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  complete: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  damaged: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  available: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"}`}>
      {status}
    </span>
  );
}
