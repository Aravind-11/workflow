"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  Package,
  PackageOpen,
  RotateCcw,
  Send,
  Shield,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { NavIconKey, NavItemDef } from "@/lib/nav/config";

const ICONS: Record<NavIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Warehouse,
  Package,
  PackageOpen,
  ClipboardList,
  Send,
  RotateCcw,
  ListTodo,
  Users,
  Calendar,
  Truck,
  Shield,
};

export function Sidebar({
  navItems,
  userLabel,
  onNavigate,
}: {
  navItems: NavItemDef[];
  userLabel: string;
  onNavigate?: () => void;
}) {
  const path = usePathname();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-r border-gray-200 bg-white dark:border-navy-border dark:bg-navy md:h-screen md:w-56">
      <div className="border-b border-gray-200 p-5 pr-12 dark:border-navy-border md:pr-5">
        <span className="font-semibold text-gray-900 dark:text-gray-100">WMS</span>
        <p className="mt-2 truncate text-xs text-gray-500 dark:text-gray-400" title={userLabel}>
          {userLabel}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = path === href || (href !== "/" && path.startsWith(href));

          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-gray-200 p-3 dark:border-navy-border">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}
