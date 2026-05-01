"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/workers", label: "Directory" },
  { href: "/workers/schedules", label: "Schedules" },
];

export function WorkerSubNav() {
  const path = usePathname();
  return (
    <div className="flex gap-6">
      {tabs.map((tab) => {
        const active =
          tab.href === "/workers"
            ? path === "/workers" ||
              (path.startsWith("/workers/") && !path.startsWith("/workers/schedules"))
            : path === tab.href || path.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] transition-colors duration-200 ${
              active
                ? "text-slate-900 dark:text-gray-50"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
