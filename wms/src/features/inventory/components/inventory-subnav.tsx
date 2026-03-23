"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/inventory/balances", label: "Balances" },
  { href: "/inventory/catalog", label: "SKU catalog" },
  { href: "/inventory/locations", label: "Locations" },
];

export function InventorySubNav() {
  const path = usePathname();

  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active =
          path === tab.href ||
          path.startsWith(`${tab.href}/`) ||
          (tab.href === "/inventory/balances" && path.startsWith("/inventory/items"));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
