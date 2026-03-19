const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  complete: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  damaged: "bg-red-100 text-red-800",
  available: "bg-green-100 text-green-800",
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
