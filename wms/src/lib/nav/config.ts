import { P } from "@/lib/auth/permissions";

export type NavIconKey =
  | "LayoutDashboard"
  | "Warehouse"
  | "Package"
  | "PackageOpen"
  | "ClipboardList"
  | "Send"
  | "RotateCcw"
  | "ListTodo"
  | "Users"
  | "Calendar"
  | "Truck"
  | "Shield";

export type NavItemDef = {
  href: string;
  label: string;
  permission: string;
  icon: NavIconKey;
};

/** Single source of truth for sidebar + route permission alignment. */
export const ALL_NAV_ITEMS: NavItemDef[] = [
  { href: "/", label: "Dashboard", permission: P.dashboard.view, icon: "LayoutDashboard" },
  { href: "/warehouses", label: "Warehouses", permission: P.warehouses.view, icon: "Warehouse" },
  { href: "/inventory", label: "Inventory", permission: P.inventory.view, icon: "Package" },
  { href: "/receiving", label: "Receiving", permission: P.receiving.manage, icon: "PackageOpen" },
  { href: "/picking", label: "Picking", permission: P.picking.manage, icon: "ClipboardList" },
  { href: "/packing", label: "Packing", permission: P.packing.manage, icon: "Package" },
  { href: "/shipping", label: "Shipping", permission: P.shipping.manage, icon: "Send" },
  { href: "/returns", label: "Returns", permission: P.returns.manage, icon: "RotateCcw" },
  { href: "/tasks", label: "Tasks", permission: P.tasks.manage, icon: "ListTodo" },
  { href: "/workers", label: "Workers", permission: P.workers.manage, icon: "Users" },
  { href: "/workers/schedules", label: "Schedules", permission: P.workers.manage, icon: "Calendar" },
  { href: "/deliveries", label: "Deliveries", permission: P.deliveries.manage, icon: "Truck" },
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
