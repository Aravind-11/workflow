"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { key: "receiving", label: "Receiving", href: "/receiving" },
  { key: "picking", label: "Picking", href: "/picking" },
  { key: "packing", label: "Packing", href: "/packing" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
] as const;

export type WorkflowStep = (typeof STEPS)[number]["key"];

export function WorkflowBreadcrumb({ active }: { active: WorkflowStep }) {
  const path = usePathname();

  return (
    <nav aria-label="Fulfillment workflow" className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
      {STEPS.map((step, i) => {
        const isCurrent = step.key === active;
        const isVisited = STEPS.findIndex((s) => s.key === active) > i;

        return (
          <span key={step.key} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden>→</span>}
            {isCurrent ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-white shadow-sm dark:bg-blue-500">
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  isVisited
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-300"
                }`}
              >
                {step.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
