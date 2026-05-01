import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";

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
  const iconTile = isWarn
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white dark:bg-white/[0.04] dark:text-slate-400 dark:group-hover:bg-amber-400/20 dark:group-hover:text-amber-300";
  const valueColor = isWarn
    ? "text-amber-600 dark:text-amber-400"
    : "text-slate-900 dark:text-gray-50";

  const inner = (
    <div className="surface relative flex h-full min-w-0 flex-col justify-between p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1px_rgb(15_23_42_/_0.12),0_10px_28px_-8px_rgb(15_23_42_/_0.15)] dark:group-hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.12),0_12px_32px_-10px_rgb(0_0_0_/_0.55)]">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${iconTile}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-4">
        <p className={`font-mono text-2xl font-semibold tabular-nums tracking-tight ${valueColor}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub ? (
          <p className="mt-1 truncate font-mono text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {sub}
          </p>
        ) : null}
      </div>
      {href ? (
        <span className="pointer-events-none absolute right-3 top-3 hidden text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
          <ArrowUpRight className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="group block h-full min-w-0 rounded-xl focus:outline-none"
      >
        {inner}
      </Link>
    );
  }
  return <div className="group block h-full min-w-0">{inner}</div>;
}
