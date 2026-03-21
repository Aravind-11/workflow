"use client";

import { ChevronDown } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";

export function CollapsibleSection({
  id,
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: string | number;
}) {
  const storageKey = `wms-dash-${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setOpen(stored === "1");
    } catch {
      /* SSR or restricted storage */
    }
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
        {badge !== undefined && badge !== 0 && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {badge}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-neutral-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
