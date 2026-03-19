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
    <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-blue-50 text-blue-800" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
