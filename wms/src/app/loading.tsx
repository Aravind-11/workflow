export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
        aria-hidden
      />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
