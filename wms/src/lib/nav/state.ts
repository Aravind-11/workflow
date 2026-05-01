import "server-only";

import { cookies } from "next/headers";
import type { NavIconKey } from "@/lib/nav/config";

/**
 * Unified user-customizable nav state for the OPERATE group.
 *
 *   labels:  href → custom label             (renames)
 *   hidden:  href[]                          (deletes; works on built-ins and customs)
 *   custom:  user-added items                (adds; route to /op/<slug>)
 *
 * Stored in a single cookie so add/delete/rename are always atomic.
 */
const COOKIE = "nventr_nav_state";
const COOKIE_OPTS = {
  path: "/",
  httpOnly: false,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

const ALLOWED_ICONS: NavIconKey[] = [
  "Package",
  "PackageOpen",
  "ClipboardList",
  "ClipboardCheck",
  "ScanBarcode",
  "Send",
  "RotateCcw",
  "Truck",
  "Puzzle",
  "ListTodo",
  "Workflow",
  "GitBranch",
  "ArrowDownToLine",
  "ArrowLeftRight",
  "BookOpen",
  "Settings",
];
const ALLOWED_ICON_SET = new Set<string>(ALLOWED_ICONS);
export const NAV_CUSTOM_ICONS = ALLOWED_ICONS;

export type NavLabelOverrides = Record<string, string>;

export type CustomOp = {
  /** Stable href like `/op/qc-review`. Generated from the label when first added. */
  href: string;
  label: string;
  icon: NavIconKey;
};

export type NavState = {
  labels: NavLabelOverrides;
  hidden: string[];
  custom: CustomOp[];
};

const EMPTY: NavState = { labels: {}, hidden: [], custom: [] };

function sanitize(raw: unknown): NavState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const obj = raw as Record<string, unknown>;

  const labels: NavLabelOverrides = {};
  if (obj.labels && typeof obj.labels === "object" && !Array.isArray(obj.labels)) {
    for (const [k, v] of Object.entries(obj.labels as Record<string, unknown>)) {
      if (typeof k === "string" && typeof v === "string" && v.trim()) {
        labels[k] = v.trim().slice(0, 40);
      }
    }
  }

  const hidden: string[] = [];
  if (Array.isArray(obj.hidden)) {
    for (const h of obj.hidden) {
      if (typeof h === "string" && h.startsWith("/") && h.length < 80 && !hidden.includes(h)) {
        hidden.push(h);
      }
    }
  }

  const custom: CustomOp[] = [];
  if (Array.isArray(obj.custom)) {
    for (const c of obj.custom) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      const href = typeof cc.href === "string" ? cc.href : "";
      const label = typeof cc.label === "string" ? cc.label.trim().slice(0, 40) : "";
      const icon = typeof cc.icon === "string" && ALLOWED_ICON_SET.has(cc.icon)
        ? (cc.icon as NavIconKey)
        : "Puzzle";
      if (
        href.startsWith("/op/") &&
        href.length < 80 &&
        label &&
        !custom.some((x) => x.href === href)
      ) {
        custom.push({ href, label, icon });
      }
    }
  }

  return { labels, hidden, custom };
}

export async function getNavState(): Promise<NavState> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return EMPTY;
  try {
    return sanitize(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return EMPTY;
  }
}

export async function setNavState(next: NavState): Promise<void> {
  const jar = await cookies();
  const cleaned = sanitize(next);
  const isEmpty =
    Object.keys(cleaned.labels).length === 0 &&
    cleaned.hidden.length === 0 &&
    cleaned.custom.length === 0;
  if (isEmpty) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, encodeURIComponent(JSON.stringify(cleaned)), COOKIE_OPTS);
}

/** Slug helper: "QC Review!" → "qc-review" */
export function slugifyOpLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `op-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Backwards compat with the original `nventr_nav_labels` cookie.
// If the new cookie is empty but the old one exists, we still serve those
// labels so users don't lose their existing renames during the migration.
// ---------------------------------------------------------------------------
export async function getNavLabelOverrides(): Promise<NavLabelOverrides> {
  const state = await getNavState();
  if (Object.keys(state.labels).length > 0) return state.labels;
  // Legacy fallback
  const jar = await cookies();
  const legacy = jar.get("nventr_nav_labels")?.value;
  if (!legacy) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(legacy));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: NavLabelOverrides = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof k === "string" && typeof v === "string" && v.trim()) {
          out[k] = v.trim().slice(0, 40);
        }
      }
      return out;
    }
  } catch {
    // ignore
  }
  return {};
}
