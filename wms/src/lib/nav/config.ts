import { P } from "@/lib/auth/permissions";

export type NavIconKey = "Truck" | "ListTodo" | "Package" | "Users" | "Shield";

export type NavItemDef = {
  href: string;
  label: string;
  permission: string;
  icon: NavIconKey;
};

/** Sidebar navigation — 4 items matching the whiteboard layout. */
export const ALL_NAV_ITEMS: NavItemDef[] = [
  { href: "/deliveries", label: "Deliveries & Returns", permission: P.deliveries.manage, icon: "Truck" },
  { href: "/receiving", label: "Tasks", permission: P.receiving.manage, icon: "ListTodo" },
  { href: "/inventory", label: "Inventory Management", permission: P.inventory.view, icon: "Package" },
  { href: "/workers/schedules", label: "Workers & Schedules", permission: P.workers.manage, icon: "Users" },
];

export const ADMIN_NAV: NavItemDef = {
  href: "/admin/users",
  label: "Users (admin)",
  permission: P.admin.users,
  icon: "Shield",
};

export function filterNav(permissions: Set<string>): NavItemDef[] {
  const base = ALL_NAV_ITEMS.filter((n) => permissions.has(n.permission));
  if (permissions.has(P.admin.users)) {
    return [...base, ADMIN_NAV];
  }
  return base;
}
