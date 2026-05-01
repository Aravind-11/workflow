"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Plus, X } from "lucide-react";
import {
  addCustomOpAction,
  deleteOpAction,
  saveNavLabelsAction,
} from "@/features/nav/actions";
import type { CustomOp } from "@/lib/nav/state";
import type { NavIconKey } from "@/lib/nav/config";

type Step = { type: string; label: string; href: string; isCustom?: boolean };

const ACTIVE_TYPE_MAP: Record<string, string> = {
  receiving: "receive",
  batches: "batch",
  picking: "pick",
  packing: "pack",
  shipping: "ship",
};

const DEFAULT_STEPS: Step[] = [
  { type: "receive", label: "Receiving", href: "/receiving" },
  { type: "batch", label: "Batches", href: "/batches" },
  { type: "pick", label: "Scanning", href: "/picking" },
  { type: "pack", label: "Packing", href: "/packing" },
  { type: "ship", label: "Shipping", href: "/shipping" },
];

const DEFAULT_HREF_TO_TYPE: Record<string, string> = Object.fromEntries(
  DEFAULT_STEPS.map((s) => [s.href, s.type]),
);

/**
 * Combined header for the operate-section pages. The H1, each pill, the
 * delete (×) on each pill, and the "+ Add" affordance all share the same
 * cookie-backed nav state used by the sidebar editor — so customizing one
 * customizes the other.
 */
export function EditableFlowHeader({
  activeHref,
  defaultTitle,
  description,
  active,
  stages,
  overrides,
  hiddenOps = [],
  customOps = [],
}: {
  activeHref: string;
  defaultTitle: string;
  description: string;
  active: string;
  stages?: Step[] | null;
  overrides: Record<string, string>;
  hiddenOps?: string[];
  customOps?: CustomOp[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingHref, setEditingHref] = useState<string | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const hidden = new Set(hiddenOps);

  const baseSteps: Step[] = stages && stages.length > 0
    ? stages
    : DEFAULT_STEPS.filter((s) => !hidden.has(s.href));

  const customSteps: Step[] = customOps.map((c) => ({
    type: `custom:${c.href}`,
    label: c.label,
    href: c.href,
    isCustom: true,
  }));

  const allSteps = [...baseSteps, ...customSteps];
  const steps = allSteps.map((s) => ({
    ...s,
    label: overrides[s.href] ?? s.label,
  }));

  // Decide what's "current". Prefer an exact href match; fall back to the
  // legacy `active` keyword mapping so older call sites keep working.
  const activeTypeFromKeyword = ACTIVE_TYPE_MAP[active] ?? active;
  const isStepCurrent = (s: Step) => {
    if (s.href === activeHref) return true;
    if (s.type === activeTypeFromKeyword) return true;
    return false;
  };

  const persist = (href: string, value: string, fallback: string) => {
    const trimmed = value.trim().slice(0, 40);
    const next = { ...overrides };
    if (!trimmed || trimmed === fallback) {
      delete next[href];
    } else {
      next[href] = trimmed;
    }
    startTransition(() => {
      saveNavLabelsAction(next);
    });
  };

  const handleDelete = (href: string) => {
    startTransition(() => {
      deleteOpAction(href);
    });
  };

  const titleValue = overrides[activeHref] ?? defaultTitle;
  const activeIdx = steps.findIndex(isStepCurrent);

  return (
    <div className="mb-6 space-y-3">
      <div>
        {titleEditing ? (
          <InlineInput
            initial={titleValue}
            placeholder={defaultTitle}
            disabled={isPending}
            onCommit={(v) => { persist(activeHref, v, defaultTitle); setTitleEditing(false); }}
            onCancel={() => setTitleEditing(false)}
            sizeClass="text-2xl font-semibold tracking-tight sm:text-[28px]"
          />
        ) : (
          <h1
            onClick={() => setTitleEditing(true)}
            title="Click to rename"
            className="group inline-flex cursor-text items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-gray-100 sm:text-[28px]"
          >
            {titleValue}
            <Pencil
              size={14}
              className="opacity-0 transition-opacity duration-150 group-hover:opacity-60"
              aria-hidden
            />
          </h1>
        )}
        <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <nav
        aria-label="Fulfillment workflow"
        className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]"
      >
        {steps.map((step, i) => {
          const isCurrent = isStepCurrent(step);
          const isVisited = activeIdx > -1 && activeIdx > i;
          const fallbackLabel = step.isCustom
            ? customOps.find((c) => c.href === step.href)?.label ?? step.label
            : DEFAULT_HREF_TO_TYPE[step.href]
              ? DEFAULT_STEPS.find((s) => s.href === step.href)?.label ?? step.label
              : step.label;
          const isEditing = editingHref === step.href;

          return (
            <span key={step.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
              )}
              {isEditing ? (
                <PillInput
                  initial={step.label}
                  placeholder={fallbackLabel}
                  isCurrent={isCurrent}
                  disabled={isPending}
                  onCommit={(v) => { persist(step.href, v, fallbackLabel); setEditingHref(null); }}
                  onCancel={() => setEditingHref(null)}
                />
              ) : isCurrent ? (
                <span
                  onDoubleClick={() => setEditingHref(step.href)}
                  className="group relative cursor-text rounded-full bg-gradient-to-b from-slate-900 to-slate-950 px-3 py-1.5 text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.08)] dark:bg-gradient-to-br dark:from-amber-300 dark:to-amber-500 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgb(251_191_36_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.45)]"
                  title="Double-click to rename"
                >
                  {step.label}
                  <span className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingHref(step.href); }}
                      aria-label={`Rename ${step.label}`}
                      title="Rename"
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Pencil size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`${step.isCustom ? "Delete" : "Hide"} "${step.label}"? You can restore from the sidebar editor.`)) {
                          handleDelete(step.href);
                        }
                      }}
                      aria-label={`Delete ${step.label}`}
                      title={step.isCustom ? "Delete" : "Hide (can be restored)"}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                    >
                      <X size={9} />
                    </button>
                  </span>
                </span>
              ) : (
                <span className="group relative inline-flex">
                  <Link
                    href={step.href}
                    className={`rounded-full px-3 py-1.5 transition-all duration-150 ${
                      isVisited
                        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 hover:-translate-y-px dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25"
                        : step.isCustom
                          ? "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-500/20 hover:-translate-y-px dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/25"
                          : "text-slate-400 hover:bg-slate-100/70 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.04] dark:hover:text-slate-300"
                    }`}
                  >
                    {step.label}
                  </Link>
                  <span className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingHref(step.href); }}
                      aria-label={`Rename ${step.label}`}
                      title="Rename"
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Pencil size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`${step.isCustom ? "Delete" : "Hide"} "${step.label}"? You can restore from the sidebar editor.`)) {
                          handleDelete(step.href);
                        }
                      }}
                      aria-label={`Delete ${step.label}`}
                      title={step.isCustom ? "Delete" : "Hide (can be restored)"}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600"
                    >
                      <X size={9} />
                    </button>
                  </span>
                </span>
              )}
            </span>
          );
        })}

        {/* Trailing add affordance */}
        <span className="flex items-center gap-1.5">
          {steps.length > 0 && (
            <span className="text-slate-300 dark:text-slate-600" aria-hidden>·</span>
          )}
          {adding ? (
            <AddPill
              disabled={isPending}
              onCommit={(label) => {
                if (!label.trim()) { setAdding(false); return; }
                startTransition(() => {
                  addCustomOpAction({ label: label.trim(), icon: "Puzzle" });
                });
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              title="Add an operation"
              aria-label="Add an operation"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-300/70 bg-white/40 px-2.5 py-1 text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-900 dark:border-amber-400/30 dark:bg-white/[0.02] dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
            >
              <Plus size={11} />
              Add
            </button>
          )}
        </span>
      </nav>
    </div>
  );
}

function InlineInput({
  initial,
  placeholder,
  disabled,
  onCommit,
  onCancel,
  sizeClass,
}: {
  initial: string;
  placeholder: string;
  disabled: boolean;
  onCommit: (v: string) => void;
  onCancel: () => void;
  sizeClass: string;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={v}
      maxLength={40}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      className={`${sizeClass} -ml-1 rounded-md bg-amber-50 px-2 py-0.5 text-slate-900 outline-none ring-2 ring-amber-300 dark:bg-amber-500/10 dark:text-gray-50 dark:ring-amber-400/40`}
    />
  );
}

function PillInput({
  initial,
  placeholder,
  isCurrent,
  disabled,
  onCommit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  isCurrent: boolean;
  disabled: boolean;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);

  const charWidth = Math.max(placeholder.length, v.length, 6);

  return (
    <input
      ref={ref}
      type="text"
      value={v}
      maxLength={40}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      style={{ width: `${charWidth + 3}ch` }}
      className={`rounded-full px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] outline-none ring-2 ring-amber-300 dark:ring-amber-400/40 ${
        isCurrent
          ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950"
          : "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
      }`}
    />
  );
}

function AddPill({
  disabled,
  onCommit,
  onCancel,
}: {
  disabled: boolean;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  return (
    <input
      ref={ref}
      type="text"
      value={v}
      maxLength={40}
      placeholder="New op…"
      disabled={disabled}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      style={{ width: `${Math.max(v.length, 8) + 3}ch` }}
      className="rounded-full bg-amber-50 px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-amber-900 outline-none ring-2 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/40"
    />
  );
}
