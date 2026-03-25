"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updateHiddenNav } from "@/features/profile/actions";

type NavOption = { href: string; label: string };

export function NavCustomizer({
  allItems,
  initialHidden,
}: {
  allItems: NavOption[];
  initialHidden: string[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(href: string) {
    setSaved(false);
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateHiddenNav([...hidden]);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {allItems.map((item) => {
          const isHidden = hidden.has(item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => toggle(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isHidden
                  ? "bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                  : "bg-white text-gray-800 hover:bg-gray-50 dark:bg-navy-surface dark:text-gray-200 dark:hover:bg-white/5"
              }`}
            >
              {isHidden ? (
                <EyeOff className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
              )}
              <span className={isHidden ? "line-through" : ""}>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {pending ? "Saving..." : "Save layout"}
        </button>
        {saved && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved</span>
        )}
      </div>
    </div>
  );
}
