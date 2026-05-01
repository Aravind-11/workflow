import { P } from "@/lib/auth/permissions";
import type { WorkflowStage } from "@/lib/workflow/types";

export type NavIconKey =
  | "LayoutDashboard"
  | "Warehouse"
  | "Package"
  | "PackageOpen"
  | "ClipboardList"
  | "ClipboardCheck"
  | "ArrowDownToLine"
  | "Send"
  | "RotateCcw"
  | "ListTodo"
  | "Users"
  | "Calendar"
  | "Truck"
  | "Shield"
  | "Pause"
  | "Puzzle"
  | "Workflow"
  | "GitBranch"
  | "FolderKanban"
  | "ScanBarcode"
  | "BarChart3"
  | "BookOpen"
  | "Settings"
  | "ArrowLeftRight";

export type NavItemDef = {
  href: string;
  label: string;
  permission: string;
  icon: NavIconKey;
  /** Whether this item was generated from a workflow stage */
  fromWorkflow?: boolean;
};

const BEFORE_WORKFLOW: NavItemDef[] = [
  { href: "/", label: "Home", permission: P.dashboard.view, icon: "LayoutDashboard" },
  { href: "/warehouses", label: "Warehouses", permission: P.warehouses.view, icon: "Warehouse" },
  { href: "/projects", label: "Projects", permission: P.projects.view, icon: "FolderKanban" },
  { href: "/blueprints", label: "Blueprints", permission: P.workflow.manage, icon: "BookOpen" },
  { href: "/inventory", label: "Inventory", permission: P.inventory.view, icon: "Package" },
];

const AFTER_WORKFLOW: NavItemDef[] = [
  { href: "/orders", label: "Orders", permission: P.orders.view, icon: "ClipboardList" },
  { href: "/purchase-orders", label: "Purchase Orders", permission: P.purchaseOrders.manage, icon: "ClipboardCheck" },
  { href: "/tracking", label: "Tracking", permission: P.tracking.view, icon: "ScanBarcode" },
  { href: "/workflow", label: "Workflow", permission: P.workflow.manage, icon: "GitBranch" },
  { href: "/returns", label: "Returns", permission: P.returns.manage, icon: "RotateCcw" },
  { href: "/tasks", label: "Tasks", permission: P.tasks.manage, icon: "ListTodo" },
  { href: "/workers", label: "Workers", permission: P.workers.manage, icon: "Users" },
  { href: "/workers/schedules", label: "Schedules", permission: P.workers.manage, icon: "Calendar" },
  { href: "/deliveries", label: "Deliveries", permission: P.deliveries.manage, icon: "Truck" },
  { href: "/transfers", label: "Transfers", permission: P.transfers.manage, icon: "ArrowLeftRight" },
  { href: "/analytics", label: "Analytics", permission: P.analytics.view, icon: "BarChart3" },
];

const STAGE_TYPE_TO_HREF: Record<string, string> = {
  receive: "/receiving",
  pick: "/picking",
  pack: "/packing",
  ship: "/shipping",
  return: "/returns",
  qc: "/stages/qc",
  putaway: "/stages/putaway",
  hold: "/stages/hold",
};

const STAGE_TYPE_TO_PERMISSION: Record<string, string> = {
  receive: P.receiving.manage,
  pick: P.picking.manage,
  pack: P.packing.manage,
  ship: P.shipping.manage,
  return: P.returns.manage,
  qc: P.receiving.manage,
  putaway: P.receiving.manage,
  hold: P.receiving.manage,
};

const DEFAULT_WORKFLOW_NAV: NavItemDef[] = [
  { href: "/receiving", label: "Receiving", permission: P.receiving.manage, icon: "PackageOpen" },
  { href: "/batches", label: "Batches", permission: P.receiving.manage, icon: "Puzzle" },
  { href: "/picking", label: "Scanning", permission: P.picking.manage, icon: "ClipboardList" },
  { href: "/packing", label: "Packing", permission: P.packing.manage, icon: "Package" },
  { href: "/shipping", label: "Shipping", permission: P.shipping.manage, icon: "Send" },
];

/** Build nav items from workflow stages (topological order preserved). */
export function buildWorkflowNav(stages: WorkflowStage[]): NavItemDef[] {
  return stages.map((stage) => ({
    href: STAGE_TYPE_TO_HREF[stage.type] ?? `/${stage.type}`,
    label: stage.label,
    permission: STAGE_TYPE_TO_PERMISSION[stage.type] ?? P.warehouses.view,
    icon: (stage.icon as NavIconKey) ?? "Package",
    fromWorkflow: true,
  }));
}

/** Fallback: the old hardcoded list (used when no workflow is active). */
export const ALL_NAV_ITEMS: NavItemDef[] = [
  ...BEFORE_WORKFLOW,
  ...DEFAULT_WORKFLOW_NAV,
  ...AFTER_WORKFLOW,
];

export const ADMIN_NAV: NavItemDef = {
  href: "/admin/users",
  label: "Users (admin)",
  permission: P.admin.users,
  icon: "Shield",
};

export function filterNav(
  permissions: Set<string>,
  workflowStages?: WorkflowStage[] | null,
): NavItemDef[] {
  const workflowNav = workflowStages?.length
    ? buildWorkflowNav(workflowStages)
    : DEFAULT_WORKFLOW_NAV;

  const workflowHrefs = new Set(workflowNav.map((n) => n.href));
  const afterFiltered = AFTER_WORKFLOW.filter((n) => !workflowHrefs.has(n.href));

  const all = [...BEFORE_WORKFLOW, ...workflowNav, ...afterFiltered];
  const base = all.filter((n) => permissions.has(n.permission));

  if (permissions.has(P.admin.users)) {
    return [...base, ADMIN_NAV];
  }
  return base;
}

// ---------------------------------------------------------------------------
// Sidebar grouping (IA redesign)
//
// The flat list above is preserved for backward compat (used by NavCustomizer
// and anywhere else that wants the full list). The Sidebar now consumes
// `NavGroupDef[]` instead — produced by `groupNav(filterNav(...))` — so the
// 21 items collapse into 7 named groups.
// ---------------------------------------------------------------------------

export type NavGroupId =
  | "home"
  | "pinned"
  | "operate"
  | "plan"
  | "catalog"
  | "insights"
  | "admin"
  | "more";

export type NavGroupDef = {
  id: NavGroupId;
  label: string;
  /** Render as a collapsible section (false for "home" / "pinned" — always-visible items). */
  collapsible: boolean;
  items: NavItemDef[];
};

const HREF_TO_GROUP: Record<string, NavGroupId> = {
  "/": "home",
  // Pinned — always visible at the top, no collapsible group around them
  "/warehouses": "pinned",
  "/projects": "pinned",
  "/workers": "pinned",
  "/workers/schedules": "pinned",
  "/workflow": "pinned",
  // Operate — the daily verbs (default workflow stages live here too)
  "/receiving": "operate",
  "/batches": "operate",
  "/picking": "operate",
  "/packing": "operate",
  "/shipping": "operate",
  "/returns": "operate",
  "/tracking": "operate",
  // Plan — orders & work
  "/orders": "plan",
  "/purchase-orders": "plan",
  "/deliveries": "plan",
  "/transfers": "plan",
  "/tasks": "plan",
  // Catalog — design-time / reference data
  "/blueprints": "catalog",
  "/inventory": "catalog",
  // Insights
  "/analytics": "insights",
  // Admin
  "/admin/users": "admin",
};

const GROUP_ORDER: NavGroupId[] = [
  "home",
  "pinned",
  "operate",
  "plan",
  "catalog",
  "insights",
  "admin",
  "more",
];

const GROUP_LABELS: Record<NavGroupId, string> = {
  home: "Home",
  pinned: "Pinned",
  operate: "Operate",
  plan: "Plan",
  catalog: "Catalog",
  insights: "Insights",
  admin: "Admin",
  more: "More",
};

const NON_COLLAPSIBLE_GROUPS = new Set<NavGroupId>(["home", "pinned"]);

/**
 * Bin a flat nav list into ordered groups. Items derived from a workflow
 * (`fromWorkflow`) always land in "operate". Anything we forgot to map
 * falls into "more" — surfaced last so it's discoverable but not noisy.
 */
export function groupNav(items: NavItemDef[]): NavGroupDef[] {
  const buckets = new Map<NavGroupId, NavItemDef[]>();
  for (const item of items) {
    const groupId: NavGroupId = item.fromWorkflow
      ? "operate"
      : (HREF_TO_GROUP[item.href] ?? "more");
    const arr = buckets.get(groupId) ?? [];
    arr.push(item);
    buckets.set(groupId, arr);
  }
  return GROUP_ORDER.filter((id) => buckets.has(id)).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    collapsible: !NON_COLLAPSIBLE_GROUPS.has(id),
    items: buckets.get(id)!,
  }));
}
