import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight } from "lucide-react";

export function MetricTile({
  href,
  label,
  value,
  icon: Icon,
  tone = "default",
  sub,
}: {
  href?: string;
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "warn";
  sub?: string;
}) {
  const isWarn = tone === "warn";
  const cardClass = isWarn
    ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5"
    : "border-slate-200 bg-white dark:border-navy-border dark:bg-navy-surface";
  const iconBg = isWarn
    ? "bg-amber-100 dark:bg-amber-500/15"
    : "bg-blue-50 dark:bg-blue-500/10";
  const iconColor = isWarn
    ? "text-amber-600 dark:text-amber-400"
    : "text-blue-600 dark:text-blue-400";

  const inner = (
    <div className={`flex h-full min-w-0 flex-col justify-between rounded-2xl border p-4 shadow-sm transition group-hover:shadow-md ${cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`shrink-0 rounded-xl p-2 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-gray-100">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub ? <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
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
        className="group block h-full min-w-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
