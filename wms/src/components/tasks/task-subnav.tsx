"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/tasks", label: "Queue" },
  { href: "/tasks/visualizer", label: "Visualizer" },
];

export function TaskSubNav() {
  const path = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-navy-border">
      {tabs.map((tab) => {
        const active =
          tab.href === "/tasks"
            ? path === "/tasks"
            : path === tab.href || path.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
