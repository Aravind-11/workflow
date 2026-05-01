"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/tasks", label: "Tickets" },
  { href: "/workers", label: "Contact Teleops" },
] as const;

export function TopBar({
  userLabel,
  onMenuToggle,
}: {
  userLabel: string;
  onMenuToggle: () => void;
}) {
  const path = usePathname();
  const initials = userLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center bg-white/80 px-4 backdrop-blur-xl shadow-[0_1px_0_rgb(15_23_42_/_0.06)] dark:bg-navy/80 dark:shadow-[0_1px_0_rgb(255_255_255_/_0.06)]">
      <button
        type="button"
        onClick={onMenuToggle}
        className="mr-3 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100/70 dark:text-slate-400 dark:hover:bg-white/[0.04] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link
        href="/"
        className="mr-8 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-gray-100"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-slate-900 to-slate-700 text-[11px] font-bold text-white dark:from-amber-300 dark:to-amber-500 dark:text-slate-950">
          n
        </span>
        Nventr
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-slate-900/90 text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)] dark:bg-white/[0.06] dark:text-gray-50"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-50 text-xs font-semibold text-slate-700 shadow-[inset_0_0_0_1px_rgb(15_23_42_/_0.06)] dark:from-white/[0.06] dark:to-white/[0.02] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)]"
          title={userLabel}
        >
          {initials || "?"}
        </div>
      </div>
    </header>
  );
}
