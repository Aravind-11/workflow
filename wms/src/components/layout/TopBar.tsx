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
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-navy-border dark:bg-navy-surface">
      <button
        type="button"
        onClick={onMenuToggle}
        className="mr-3 rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/" className="mr-8 text-lg font-bold text-blue-600 dark:text-blue-400">
        WMS
      </Link>

      <nav className="hidden items-center gap-1 md:flex">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-navy-border dark:text-gray-300"
          title={userLabel}
        >
          {initials || "?"}
        </div>
      </div>
    </header>
  );
}
