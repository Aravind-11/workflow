type BatchRow = {
  id: string;
  title: string;
  completedAt: string | Date | null;
  dueDate: string | Date | null;
  status: string;
  workerProfile: { firstName: string; lastName: string } | null;
};

function parseBatchTitle(title: string): { batchName: string | null; boxId: string | null } {
  // Loader writes "Batch <batchName> for <boxId>"
  const m = /^Batch\s+(.+?)\s+for\s+(\S+)/i.exec(title);
  return { batchName: m?.[1] ?? null, boxId: m?.[2] ?? null };
}

export function BatchesPanel({ batches }: { batches: BatchRow[] }) {
  const total = batches.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = batches.filter((b) => {
    const at = b.completedAt ? new Date(b.completedAt) : null;
    return at && at.getTime() >= today.getTime();
  }).length;

  // Top-3 preppers
  const tally = new Map<string, number>();
  for (const b of batches) {
    if (!b.workerProfile) continue;
    const name = `${b.workerProfile.firstName} ${b.workerProfile.lastName}`.trim();
    if (!name) continue;
    tally.set(name, (tally.get(name) ?? 0) + 1);
  }
  const topPreppers = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (total === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Batch creation
          </h2>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
            Boxes prepped into scan batches before they hit the scanner.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-amber-900 dark:bg-white/10 dark:text-amber-200">
            {total.toLocaleString()} total
          </span>
          <span className="rounded-md bg-white/70 px-2 py-1 font-mono text-amber-900 dark:bg-white/10 dark:text-amber-200">
            {todayCount.toLocaleString()} today
          </span>
        </div>
      </div>

      {topPreppers.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="text-amber-800/70 dark:text-amber-200/60">Top preppers:</span>
          {topPreppers.map(([name, n]) => (
            <span
              key={name}
              className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
            >
              {name} <span className="opacity-70">· {n}</span>
            </span>
          ))}
        </div>
      ) : null}

      <details className="mt-3" open>
        <summary className="cursor-pointer text-xs font-medium text-amber-900 hover:underline dark:text-amber-200">
          Show recent batches
        </summary>
        <div className="mt-2 overflow-x-auto rounded-lg border border-amber-200 bg-white dark:border-amber-500/20 dark:bg-navy-surface">
          <table className="w-full text-sm">
            <thead className="bg-amber-50/70 text-left text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              <tr>
                <th className="px-3 py-2">Batch</th>
                <th className="px-3 py-2">Box</th>
                <th className="px-3 py-2">Prepper</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Prepped at</th>
              </tr>
            </thead>
            <tbody>
              {batches.slice(0, 25).map((b) => {
                const parsed = parseBatchTitle(b.title);
                const op = b.workerProfile
                  ? `${b.workerProfile.firstName} ${b.workerProfile.lastName}`.trim()
                  : null;
                const at = b.completedAt ?? b.dueDate ?? null;
                return (
                  <tr key={b.id} className="border-t border-amber-100 dark:border-amber-500/10">
                    <td className="px-3 py-2 font-mono text-xs">{parsed.batchName ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{parsed.boxId ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{op ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        b.status === "COMPLETED"
                          ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                          : b.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
                      }`}>
                        {b.status.replace("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      {at ? new Date(at).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
