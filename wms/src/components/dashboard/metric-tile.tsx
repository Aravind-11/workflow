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
  variant = "card",
}: {
  href?: string;
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: "slate" | "amber" | "rose" | "emerald" | "violet" | "sky";
  sub?: string;
  variant?: "card" | "compact";
}) {
  const formatted = typeof value === "number" ? value.toLocaleString() : value;

  if (variant === "compact") {
    const wrap = (children: React.ReactNode) =>
      href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 transition hover:shadow-sm"
        >
          {children}
        </Link>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2">
          {children}
        </div>
      );

    return wrap(
      <>
        <Icon className="h-4 w-4 text-neutral-500" />
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="text-lg font-semibold tabular-nums text-neutral-900">{formatted}</p>
        </div>
      </>,
    );
  }

  const tones: Record<string, string> = {
    slate: "bg-neutral-100 text-neutral-700 border-border",
    amber: "bg-warning-50 text-warning-700 border-warning-100",
    rose: "bg-danger-50 text-danger-700 border-danger-100",
    emerald: "bg-success-50 text-success-700 border-success-100",
    violet: "bg-primary-50 text-primary-700 border-primary-100",
    sky: "bg-info-50 text-info-700 border-info-100",
  };

  const inner = (
    <div
      className={`flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition group-hover:shadow-md ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600/90">{label}</p>
        <span className={`rounded-xl p-2 ${tone === "slate" ? "bg-white/80" : "bg-white/60"}`}>
          <Icon className="h-4 w-4 opacity-90" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">
          {formatted}
        </p>
        {sub ? <p className="mt-1 text-xs text-neutral-600">{sub}</p> : null}
      </div>
      {href ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-700 opacity-0 transition group-hover:opacity-100">
          View <ArrowRight className="h-3 w-3" />
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
