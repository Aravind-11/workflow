const styles: Record<string, string> = {
  // Awaiting action
  pending: "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-500/20",
  open: "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-500/20",
  draft: "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-500/20",

  // In progress
  in_progress: "bg-info-50 text-info-700 ring-1 ring-inset ring-info-500/20",
  authorized: "bg-info-50 text-info-700 ring-1 ring-inset ring-info-500/20",
  qc: "bg-info-50 text-info-700 ring-1 ring-inset ring-info-500/20",
  picked: "bg-info-50 text-info-700 ring-1 ring-inset ring-info-500/20",
  packed: "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-500/20",
  received: "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-500/20",

  // Completed
  posted: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  shipped: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  delivered: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  complete: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  completed: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  closed: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  available: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-500/20",
  created: "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-500/20",

  // Negative
  cancelled: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-500/20",
  rejected: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-500/20",
  damaged: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-500/20",
};

export default function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/ /g, "_");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[key] ?? "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/20"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
