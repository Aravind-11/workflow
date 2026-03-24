/**
 * Central permission strings for RBAC. Roles map to subsets of these in {@link permissionsForRoles}.
 */
export const P = {
  dashboard: { view: "dashboard:view" },
  inventory: { view: "inventory:view", write: "inventory:write" },
  receiving: { manage: "receiving:manage" },
  picking: { manage: "picking:manage" },
  packing: { manage: "packing:manage" },
  shipping: { manage: "shipping:manage" },
  deliveries: { manage: "deliveries:manage" },
  returns: { manage: "returns:manage" },
  workers: { manage: "workers:manage" },
  tasks: { manage: "tasks:manage" },
  warehouses: { view: "warehouses:view" },
  admin: { users: "admin:users" },
} as const;

/** All permission strings (for admin role). */
export const ALL_PERMISSIONS: string[] = [
  P.dashboard.view,
  P.inventory.view,
  P.inventory.write,
  P.receiving.manage,
  P.picking.manage,
  P.packing.manage,
  P.shipping.manage,
  P.deliveries.manage,
  P.returns.manage,
  P.workers.manage,
  P.tasks.manage,
  P.warehouses.view,
  P.admin.users,
];

/**
 * Role names must match `Role.name` in the database (seed / admin UI).
 */
export const APP_ROLES = [
  "admin",
  "warehouse_manager",
  "supervisor",
  "picker",
  "packer",
  "receiver",
  "dispatcher",
  "viewer",
] as const;

export type AppRoleName = (typeof APP_ROLES)[number];

/** Maps each app role to permissions (admin is handled specially — full set). */
export const ROLE_PERMISSIONS: Record<AppRoleName, readonly string[]> = {
  admin: ALL_PERMISSIONS,
  warehouse_manager: [
    P.dashboard.view,
    P.inventory.view,
    P.inventory.write,
    P.receiving.manage,
    P.picking.manage,
    P.packing.manage,
    P.shipping.manage,
    P.deliveries.manage,
    P.returns.manage,
    P.workers.manage,
    P.tasks.manage,
    P.warehouses.view,
  ],
  supervisor: [
    P.dashboard.view,
    P.inventory.view,
    P.receiving.manage,
    P.picking.manage,
    P.packing.manage,
    P.shipping.manage,
    P.deliveries.manage,
    P.returns.manage,
    P.workers.manage,
    P.tasks.manage,
    P.warehouses.view,
  ],
  picker: [P.dashboard.view, P.inventory.view, P.picking.manage, P.warehouses.view],
  packer: [P.dashboard.view, P.inventory.view, P.packing.manage, P.warehouses.view],
  receiver: [P.dashboard.view, P.inventory.view, P.receiving.manage, P.warehouses.view],
  dispatcher: [
    P.dashboard.view,
    P.inventory.view,
    P.shipping.manage,
    P.deliveries.manage,
    P.returns.manage,
    P.warehouses.view,
  ],
  /** Read-mostly default: full nav + pages; tighten per-action rules in routes if needed. */
  viewer: [
    P.dashboard.view,
    P.inventory.view,
    P.warehouses.view,
    P.deliveries.manage,
    P.receiving.manage,
    P.workers.manage,
    P.tasks.manage,
  ],
};

export function mergePermissions(roleNames: string[]): Set<string> {
  const out = new Set<string>();
  for (const name of roleNames) {
    if (name === "admin") {
      ALL_PERMISSIONS.forEach((p) => out.add(p));
      continue;
    }
    const list = ROLE_PERMISSIONS[name as AppRoleName];
    if (list) list.forEach((p) => out.add(p));
  }
  return out;
}

export function hasPermission(permissions: Set<string>, permission: string): boolean {
  return permissions.has(permission);
}
