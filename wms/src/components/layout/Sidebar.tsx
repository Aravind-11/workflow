"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodo, Package, Shield, Truck, Users } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { NavIconKey, NavItemDef } from "@/lib/nav/config";

const ICONS: Record<NavIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  Truck,
  ListTodo,
  Package,
  Users,
  Shield,
};

export function Sidebar({
  navItems,
  onNavigate,
}: {
  navItems: NavItemDef[];
  onNavigate?: () => void;
}) {
  const path = usePathname();

  return (
    <aside className="flex h-full w-full min-w-0 flex-col border-r border-gray-200 bg-white dark:border-navy-border dark:bg-navy">
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        {navItems.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const active = path === href || (href !== "/" && path.startsWith(href));

          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              onClick={() => onNavigate?.()}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-blue-600 font-medium text-white shadow-sm dark:bg-blue-500/15 dark:text-blue-400 dark:border-l-2 dark:border-blue-500 dark:bg-transparent dark:rounded-none dark:pl-2.5"
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
