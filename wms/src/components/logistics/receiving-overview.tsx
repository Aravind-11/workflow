import { ReceiptStatus } from "@prisma/client";
import type { ReceiptRow } from "@/features/logistics/types/receiving";

/**
 * "Mailroom at a glance" panel: same amber/yellow treatment as the
 * BatchesPanel on /batches. Sits at the top of /receiving so an operator
 * (or an admin scanning a warehouse) can see the day's manifest health
 * without scrolling through the row table:
 *
 *   - Total receipts in this warehouse, today's count
 *   - Status breakdown (Draft / Received / Posted)
 *   - Top couriers (LASD, USPS, FedEx, …)
 *   - Top operators (parsed out of Receipt.notes — mailroom loader writes
 *     "Box <id> · Operator <name> · USPS <tracking>")
 *
 * Renders nothing if there are no receipts yet — so first-load empty
 * warehouses don't show a confusing empty card.
 */

function deriveOperator(notes: string | null): string | null {
  if (!notes) return null;
  return /(?:Operator|op)\s+([^·]+?)\s*(?:·|$)/i.exec(notes)?.[1]?.trim() ?? null;
}

function topN<T extends string>(values: (T | null | undefined)[], n: number): [T, number][] {
  const tally = new Map<T, number>();
  for (const v of values) {
    if (!v) continue;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function ReceivingOverview({ receipts }: { receipts: ReceiptRow[] }) {
  const total = receipts.length;
  if (total === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = receipts.filter((r) => {
    const at = new Date(r.receivedAt);
    return at.getTime() >= today.getTime();
  }).length;

  const draft = receipts.filter((r) => r.status === ReceiptStatus.DRAFT).length;
  const received = receipts.filter((r) => r.status === ReceiptStatus.RECEIVED).length;
  const posted = receipts.filter((r) => r.status === ReceiptStatus.POSTED).length;

  const topCouriers = topN(receipts.map((r) => r.delivery?.carrier ?? null), 3);
  const topOperators = topN(receipts.map((r) => deriveOperator(r.notes)), 3);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Mailroom at a glance
          </h2>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/70">
            Manifest receipts captured for this warehouse — status, couriers, operators.
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

      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800/70 dark:text-amber-200/60">
            Status
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusPill label="Draft" count={draft} tone="amber" />
            <StatusPill label="Received" count={received} tone="blue" />
            <StatusPill label="Posted" count={posted} tone="green" />
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800/70 dark:text-amber-200/60">
            Top couriers
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topCouriers.length === 0 ? (
              <span className="text-amber-800/50 dark:text-amber-200/40">—</span>
            ) : (
              topCouriers.map(([name, n]) => (
                <span
                  key={name}
                  className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                >
                  {name} <span className="opacity-70">· {n}</span>
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-800/70 dark:text-amber-200/60">
            Top operators
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {topOperators.length === 0 ? (
              <span className="text-amber-800/50 dark:text-amber-200/40">—</span>
            ) : (
              topOperators.map(([name, n]) => (
                <span
                  key={name}
                  className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
                >
                  {name} <span className="opacity-70">· {n}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "amber" | "blue" | "green";
}) {
  const cls =
    tone === "green"
      ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
      : tone === "blue"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300"
        : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200";
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${cls}`}>
      {label} <span className="opacity-70">· {count.toLocaleString()}</span>
    </span>
  );
}
