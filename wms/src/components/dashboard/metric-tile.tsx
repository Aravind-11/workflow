import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";

export function MetricTile({
  href,
  label,
  value,
  icon: Icon,
  tone = "slate",
  sub,
}: {
  href?: string;
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "slate" | "amber" | "rose" | "emerald" | "violet" | "sky";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700/50",
    amber: "bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    rose: "bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    violet: "bg-violet-50 text-violet-800 border-violet-200/90 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
    sky: "bg-sky-50 text-sky-800 border-sky-200/90 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  };
  const inner = (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition group-hover:shadow-md ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600/90 dark:text-slate-400">{label}</p>
        <span className={`rounded-xl p-2 ${tone === "slate" ? "bg-white/80 dark:bg-white/10" : "bg-white/60 dark:bg-white/10"}`}>
          <Icon className="h-4 w-4 opacity-90" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{sub}</p> : null}
      </div>
      {href ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700 opacity-0 transition group-hover:opacity-100 dark:text-blue-400">
          View <ArrowRight className="h-3 w-3" />
        </p>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
