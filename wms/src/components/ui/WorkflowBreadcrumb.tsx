"use client";

import Link from "next/link";

interface BreadcrumbStage {
  type: string;
  label: string;
  href: string;
}

const STAGE_TYPE_TO_HREF: Record<string, string> = {
  receive: "/receiving",
  batch: "/batches",
  pick: "/picking",
  pack: "/packing",
  ship: "/shipping",
  return: "/returns",
  qc: "/stages/qc",
  putaway: "/stages/putaway",
  hold: "/stages/hold",
};

const DEFAULT_STEPS: BreadcrumbStage[] = [
  { type: "receive", label: "Receiving", href: "/receiving" },
  { type: "batch", label: "Batches", href: "/batches" },
  { type: "pick", label: "Scanning", href: "/picking" },
  { type: "pack", label: "Packing", href: "/packing" },
  { type: "ship", label: "Shipping", href: "/shipping" },
];

export type WorkflowStep = "receiving" | "batches" | "picking" | "packing" | "shipping";

const ACTIVE_TYPE_MAP: Record<string, string> = {
  receiving: "receive",
  batches: "batch",
  picking: "pick",
  packing: "pack",
  shipping: "ship",
};

export function WorkflowBreadcrumb({
  active,
  stages,
  overrideLabels,
}: {
  active: string;
  stages?: BreadcrumbStage[] | null;
  /** Map of href → custom label (driven by the sidebar's rename feature). */
  overrideLabels?: Record<string, string>;
}) {
  const baseSteps = stages && stages.length > 0 ? stages : DEFAULT_STEPS;
  const steps = overrideLabels
    ? baseSteps.map((s) => ({ ...s, label: overrideLabels[s.href] ?? s.label }))
    : baseSteps;
  const activeType = ACTIVE_TYPE_MAP[active] ?? active;

  return (
    <nav
      aria-label="Fulfillment workflow"
      className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]"
    >
      {steps.map((step, i) => {
        const isCurrent = step.type === activeType;
        const activeIdx = steps.findIndex((s) => s.type === activeType);
        const isVisited = activeIdx > i;

        return (
          <span key={step.type} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                ·
              </span>
            )}
            {isCurrent ? (
              <span className="rounded-full bg-gradient-to-b from-slate-900 to-slate-950 px-3 py-1.5 text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.08)] dark:bg-gradient-to-br dark:from-amber-300 dark:to-amber-500 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgb(251_191_36_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.45)]">
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                className={`rounded-full px-3 py-1.5 transition-all duration-150 ${
                  isVisited
                    ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:-translate-y-px dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25"
                    : "text-slate-400 hover:bg-slate-100/70 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.04] dark:hover:text-slate-300"
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

export function buildBreadcrumbStages(
  workflowStages: { type: string; label: string }[],
): BreadcrumbStage[] {
  return workflowStages.map((s) => ({
    type: s.type,
    label: s.label,
    href: STAGE_TYPE_TO_HREF[s.type] ?? `/stages/${s.type}`,
  }));
}
