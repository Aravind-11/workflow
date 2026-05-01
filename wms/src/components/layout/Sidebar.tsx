"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  Package,
  PackageOpen,
  Pause,
  Pencil,
  Puzzle,
  RotateCcw,
  ScanBarcode,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
  Undo2,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  addCustomOpAction,
  deleteOpAction,
  resetNavLabelsAction,
  restoreOpAction,
  saveNavLabelsAction,
} from "@/features/nav/actions";
import { switchWarehouseAction, switchProjectAction } from "@/features/warehouses/actions";
import type { NavGroupDef, NavIconKey, NavItemDef } from "@/lib/nav/config";
import type { CustomOp } from "@/lib/nav/state";

const ICON_PICKER: NavIconKey[] = [
  "Puzzle", "Package", "PackageOpen", "ClipboardList", "ClipboardCheck",
  "ScanBarcode", "Send", "RotateCcw", "Truck", "ListTodo",
  "Workflow", "GitBranch", "ArrowDownToLine", "ArrowLeftRight",
  "BookOpen", "Settings",
];

const ICONS: Record<NavIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Warehouse,
  Package,
  PackageOpen,
  ClipboardList,
  ClipboardCheck,
  ArrowDownToLine,
  Send,
  RotateCcw,
  ListTodo,
  Users,
  Calendar,
  Truck,
  Shield,
  Pause,
  Puzzle,
  Workflow: GitBranch,
  GitBranch,
  FolderKanban,
  ScanBarcode,
  BarChart3,
  BookOpen,
  Settings,
  ArrowLeftRight,
};

const COLLAPSED_STORAGE_KEY = "wms.sidebar.collapsed.v1";

function useCollapsedGroups(activeGroupId: string | null) {
  // Set of group IDs the user has explicitly collapsed.
  // Default = empty set (everything expanded on first visit — discoverable).
  // Active group always wins: if you navigate into a collapsed group, it auto-expands.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCollapsed(new Set(parsed.filter((x): x is string => typeof x === "string")));
        }
      }
    } catch {
      // ignore — stale data, private mode, etc.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Whenever the active group changes, make sure it's expanded.
  useEffect(() => {
    if (!activeGroupId) return;
    setCollapsed((prev) => {
      if (!prev.has(activeGroupId)) return prev;
      const next = new Set(prev);
      next.delete(activeGroupId);
      return next;
    });
  }, [activeGroupId]);

  const toggle = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, hydrated };
}

export function Sidebar({
  navGroups,
  userLabel,
  onNavigate,
  warehouseOptions,
  selectedWarehouseId,
  projectOptions,
  selectedProjectId,
  hiddenOps = [],
  customOps = [],
  viewMode = null,
  activeWarehouseLabel = null,
}: {
  navGroups: NavGroupDef[];
  userLabel: string;
  onNavigate?: () => void;
  warehouseOptions?: { id: string; code: string; name: string }[];
  selectedWarehouseId?: string | null;
  projectOptions?: { id: string; code: string; name: string }[];
  selectedProjectId?: string | null;
  hiddenOps?: string[];
  customOps?: CustomOp[];
  viewMode?: "admin" | "operator" | null;
  activeWarehouseLabel?: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Operator mode is scoped to a single warehouse, so cross-warehouse pages
  // (the global warehouse list, cross-warehouse analytics) are noise. The
  // server-side layout already filters these from `navGroups`, but we filter
  // again here as a defence-in-depth measure: dev HMR / Turbopack module
  // staleness can occasionally serve a navGroups payload that still contains
  // them, and clients have reported the "Warehouses" tab reappearing.
  const effectiveGroups = useMemo(() => {
    if (viewMode !== "operator") return navGroups;
    const blocked = new Set(["/warehouses", "/analytics"]);
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((it) => !blocked.has(it.href)) }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, viewMode]);

  // Flatten once for active-href detection.
  const flatItems = useMemo(
    () => effectiveGroups.flatMap((g) => g.items),
    [effectiveGroups],
  );

  const activeHref = useMemo(() => {
    return (
      flatItems.reduce<string | null>((best, { href }) => {
        const matches = path === href || (href !== "/" && path.startsWith(href + "/"));
        if (!matches) return best;
        return !best || href.length > best.length ? href : best;
      }, null) ?? (path === "/" ? "/" : null)
    );
  }, [flatItems, path]);

  const activeGroupId = useMemo(() => {
    if (!activeHref) return null;
    for (const g of effectiveGroups) {
      if (g.items.some((it) => it.href === activeHref)) return g.id;
    }
    return null;
  }, [activeHref, effectiveGroups]);

  const { collapsed, toggle } = useCollapsedGroups(activeGroupId);

  // Inline-edit state for renaming items in the OPERATE group.
  const [editingOperate, setEditingOperate] = useState(false);
  const operateGroup = effectiveGroups.find((g) => g.id === "operate");
  const operateDefaults = useMemo(() => {
    const out: Record<string, string> = {};
    if (!operateGroup) return out;
    for (const it of operateGroup.items) out[it.href] = it.label;
    return out;
  }, [operateGroup]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>(operateDefaults);
  useEffect(() => { setDraftLabels(operateDefaults); }, [operateDefaults]);
  const [savingLabels, setSavingLabels] = useState(false);

  const onSaveLabels = useCallback(async () => {
    if (!operateGroup) return;
    setSavingLabels(true);
    // Only persist labels that differ from the loader-default. We can't see the
    // *original* default here (after the cookie has been applied server-side),
    // so we just send everything non-empty; the cookie reader will trim and the
    // server reapplies on next render.
    const overrides: Record<string, string> = {};
    for (const it of operateGroup.items) {
      const next = (draftLabels[it.href] ?? "").trim();
      if (next && next !== it.label) overrides[it.href] = next;
      else if (next) overrides[it.href] = next; // keep existing override visible
    }
    try {
      await saveNavLabelsAction(overrides);
      setEditingOperate(false);
    } finally {
      setSavingLabels(false);
    }
  }, [operateGroup, draftLabels]);

  const onResetLabels = useCallback(async () => {
    setSavingLabels(true);
    try {
      await resetNavLabelsAction();
      setEditingOperate(false);
    } finally {
      setSavingLabels(false);
    }
  }, []);

  const onDeleteOp = useCallback(async (href: string) => {
    setSavingLabels(true);
    try { await deleteOpAction(href); } finally { setSavingLabels(false); }
  }, []);

  const onRestoreOp = useCallback(async (href: string) => {
    setSavingLabels(true);
    try { await restoreOpAction(href); } finally { setSavingLabels(false); }
  }, []);

  const onAddOp = useCallback(async (label: string, icon: NavIconKey) => {
    setSavingLabels(true);
    try {
      const { href } = await addCustomOpAction({ label, icon });
      router.push(href);
    } finally {
      setSavingLabels(false);
    }
  }, [router]);

  return (
    <aside className="relative flex h-full w-full min-w-0 flex-col bg-white/70 backdrop-blur-xl dark:bg-navy/80 md:h-screen md:w-56">
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id="nav-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent dark:via-white/10"
      />

      <Link
        href="/settings/profile"
        onClick={() => onNavigate?.()}
        className="group relative block px-5 pt-5 pb-4 pr-12 transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.03] md:pr-5"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-slate-900 to-slate-700 text-[11px] font-bold text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.1)] dark:from-amber-300 dark:to-amber-500 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgb(251_191_36_/_0.9),inset_0_1px_0_rgb(255_255_255_/_0.45)]">
            n
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-gray-100">
            nventr
          </span>
        </div>
        <p
          className="mt-2 truncate font-mono text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400"
          title={userLabel}
        >
          {userLabel}
        </p>
      </Link>

      <hr className="hairline mx-3" />

      {viewMode && (
        <div className="px-3 pt-3">
          <Link
            href="/start"
            onClick={() => onNavigate?.()}
            className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
              viewMode === "admin"
                ? "bg-amber-100/60 text-amber-900 ring-1 ring-inset ring-amber-300/60 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30 dark:hover:bg-amber-500/15"
                : "bg-blue-100/60 text-blue-900 ring-1 ring-inset ring-blue-300/60 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-400/30 dark:hover:bg-blue-500/15"
            }`}
            title="Switch view mode"
          >
            <span className="flex min-w-0 items-center gap-2">
              {viewMode === "admin" ? (
                <ShieldCheck size={13} className="shrink-0" />
              ) : (
                <Package size={13} className="shrink-0" />
              )}
              <span className="min-w-0 truncate">
                <span className="block font-mono text-[9.5px] font-medium uppercase tracking-[0.18em] opacity-70">
                  {viewMode === "admin" ? "Admin view" : "Operator"}
                </span>
                <span className="block truncate text-[12px] font-semibold tracking-tight">
                  {viewMode === "admin"
                    ? "All warehouses"
                    : (activeWarehouseLabel ?? "Pick warehouse")}
                </span>
              </span>
            </span>
            <ArrowLeftRight
              size={11}
              className="shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
            />
          </Link>
        </div>
      )}

      {/*
        Warehouse picker — only relevant in admin view. In operator view the
        user is locked to a single warehouse (chosen on /start/operator); the
        mode pill above already shows the active one and routes to /start to
        change it. Showing the dropdown here would feel like a "Warehouses"
        tab and contradict the scoped experience.
      */}
      {viewMode !== "operator" && warehouseOptions && warehouseOptions.length > 0 && (
        <div className="px-3 py-3">
          <label className="block font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-500">
            Warehouse
          </label>
          <select
            value={selectedWarehouseId ?? ""}
            disabled={isPending}
            onChange={(e) => {
              startTransition(() => {
                switchWarehouseAction(e.target.value);
              });
            }}
            className="mt-1.5 w-full rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-slate-800 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08),0_1px_2px_rgb(15_23_42_/_0.03)] outline-none transition-shadow focus:shadow-[0_0_0_1px_rgb(15_23_42_/_0.2),0_0_0_3px_rgb(251_191_36_/_0.2)] disabled:opacity-50 dark:bg-white/[0.04] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:focus:shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.4),0_0_0_3px_rgb(251_191_36_/_0.15)]"
          >
            {warehouseOptions.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.code} — {wh.name}
              </option>
            ))}
          </select>

          {projectOptions && projectOptions.length > 0 && (
            <>
              <label className="mt-3 block font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-500">
                Project
              </label>
              <select
                value={selectedProjectId ?? ""}
                disabled={isPending}
                onChange={(e) => {
                  startTransition(() => {
                    switchProjectAction(e.target.value);
                  });
                }}
                className="mt-1.5 w-full rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-slate-800 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08),0_1px_2px_rgb(15_23_42_/_0.03)] outline-none transition-shadow focus:shadow-[0_0_0_1px_rgb(15_23_42_/_0.2),0_0_0_3px_rgb(251_191_36_/_0.2)] disabled:opacity-50 dark:bg-white/[0.04] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:focus:shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.4),0_0_0_3px_rgb(251_191_36_/_0.15)]"
              >
                <option value="">All projects</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/*
        Operator view still gets a project dropdown when the active warehouse
        has multiple projects — they should be able to focus their floor view
        without leaving the warehouse.
      */}
      {viewMode === "operator" && projectOptions && projectOptions.length > 0 && (
        <div className="px-3 py-3">
          <label className="block font-mono text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-slate-500">
            Project
          </label>
          <select
            value={selectedProjectId ?? ""}
            disabled={isPending}
            onChange={(e) => {
              startTransition(() => {
                switchProjectAction(e.target.value);
              });
            }}
            className="mt-1.5 w-full rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-slate-800 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08),0_1px_2px_rgb(15_23_42_/_0.03)] outline-none transition-shadow focus:shadow-[0_0_0_1px_rgb(15_23_42_/_0.2),0_0_0_3px_rgb(251_191_36_/_0.2)] disabled:opacity-50 dark:bg-white/[0.04] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:focus:shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.4),0_0_0_3px_rgb(251_191_36_/_0.15)]"
          >
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {((viewMode !== "operator" && warehouseOptions && warehouseOptions.length > 0) ||
        (viewMode === "operator" && projectOptions && projectOptions.length > 0)) && (
        <hr className="hairline mx-3" />
      )}

      <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-3">
        {effectiveGroups.map((group) => {
          if (!group.collapsible) {
            return (
              <div key={group.id} className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={item.href === activeHref}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            );
          }

          const isCollapsed = collapsed.has(group.id);
          const hasActive = group.items.some((it) => it.href === activeHref);
          const isOperate = group.id === "operate";
          const isEditingThis = isOperate && editingOperate;

          return (
            <div key={group.id} className="mt-3 first:mt-0">
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => toggle(group.id)}
                  aria-expanded={!isCollapsed}
                  className="group flex flex-1 items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <ChevronRight
                    size={10}
                    className={`shrink-0 transition-transform duration-150 ${
                      isCollapsed ? "rotate-0" : "rotate-90"
                    }`}
                  />
                  <span className="truncate">{group.label}</span>
                  {hasActive && !isEditingThis && (
                    <span
                      aria-hidden
                      className="ml-auto h-1 w-1 rounded-full bg-gradient-to-br from-blue-500 to-amber-400"
                    />
                  )}
                </button>
                {isOperate && !isEditingThis && (
                  <button
                    type="button"
                    onClick={() => {
                      // Auto-expand when entering edit mode so all rows are visible.
                      if (collapsed.has(group.id)) toggle(group.id);
                      setEditingOperate(true);
                    }}
                    aria-label={`Rename ${group.label} items`}
                    title="Rename items"
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {isEditingThis ? (
                    <NavGroupEditor
                      items={group.items}
                      drafts={draftLabels}
                      onChange={(href, val) =>
                        setDraftLabels((prev) => ({ ...prev, [href]: val }))
                      }
                      onSave={onSaveLabels}
                      onCancel={() => {
                        setDraftLabels(operateDefaults);
                        setEditingOperate(false);
                      }}
                      onReset={onResetLabels}
                      saving={savingLabels}
                      onDelete={onDeleteOp}
                      onRestore={onRestoreOp}
                      onAdd={onAddOp}
                      hiddenOps={hiddenOps}
                      customHrefs={new Set(customOps.map((c) => c.href))}
                    />
                  ) : (
                    group.items.map((item) => (
                      <NavLink
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
                        onNavigate={onNavigate}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <hr className="hairline mx-3" />

      <div className="space-y-0.5 p-2">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </aside>
  );
}

function NavGroupEditor({
  items,
  drafts,
  onChange,
  onSave,
  onCancel,
  onReset,
  saving,
  onDelete,
  onRestore,
  onAdd,
  hiddenOps,
  customHrefs,
}: {
  items: NavItemDef[];
  drafts: Record<string, string>;
  onChange: (href: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  saving: boolean;
  onDelete: (href: string) => void;
  onRestore: (href: string) => void;
  onAdd: (label: string, icon: NavIconKey) => void;
  hiddenOps: string[];
  customHrefs: Set<string>;
}) {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { firstInputRef.current?.focus(); firstInputRef.current?.select(); }, []);

  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addIcon, setAddIcon] = useState<NavIconKey>("Puzzle");
  const [showRestore, setShowRestore] = useState(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (adding) addInputRef.current?.focus(); }, [adding]);

  const builtInsHidden = hiddenOps.filter((h) => !customHrefs.has(h));
  const AddIconCmp = ICONS[addIcon];

  return (
    <div className="space-y-1 rounded-lg border border-amber-200/60 bg-amber-50/40 p-1.5 dark:border-amber-500/20 dark:bg-amber-500/5">
      {items.map((item, idx) => {
        const Icon = ICONS[item.icon];
        const isCustom = customHrefs.has(item.href);
        return (
          <div key={item.href} className="group/row flex items-center gap-1.5 rounded-md px-1.5 py-1">
            <Icon size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <input
              ref={idx === 0 ? firstInputRef : undefined}
              type="text"
              value={drafts[item.href] ?? ""}
              maxLength={40}
              onChange={(e) => onChange(item.href, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); onSave(); }
                if (e.key === "Escape") { e.preventDefault(); onCancel(); }
              }}
              placeholder={item.label}
              className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm text-slate-800 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08)] outline-none transition-shadow focus:shadow-[0_0_0_1px_rgb(251_191_36_/_0.6),0_0_0_3px_rgb(251_191_36_/_0.18)] disabled:opacity-50 dark:bg-white/[0.05] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:focus:shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.5)]"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => onDelete(item.href)}
              disabled={saving}
              aria-label={isCustom ? `Delete ${item.label}` : `Hide ${item.label}`}
              title={isCustom ? "Delete custom tab" : "Hide tab (can be restored)"}
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-rose-100 hover:text-rose-600 group-hover/row:opacity-100 disabled:cursor-not-allowed dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-md border border-amber-300/60 bg-white/70 p-1.5 dark:border-amber-400/30 dark:bg-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <span className="relative">
              <button
                type="button"
                onClick={() => {
                  const next = ICON_PICKER[(ICON_PICKER.indexOf(addIcon) + 1) % ICON_PICKER.length];
                  setAddIcon(next);
                }}
                title={`Icon: ${addIcon} (click to cycle)`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08)] transition-colors hover:bg-slate-50 dark:bg-white/[0.05] dark:text-slate-300 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)]"
              >
                <AddIconCmp size={13} />
              </button>
            </span>
            <input
              ref={addInputRef}
              type="text"
              value={addLabel}
              maxLength={40}
              onChange={(e) => setAddLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addLabel.trim()) {
                    onAdd(addLabel.trim(), addIcon);
                    setAddLabel("");
                    setAdding(false);
                  }
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setAddLabel("");
                  setAdding(false);
                }
              }}
              placeholder="New tab name"
              className="min-w-0 flex-1 rounded-md bg-white px-2 py-1 text-sm text-slate-800 shadow-[0_0_0_1px_rgb(15_23_42_/_0.08)] outline-none transition-shadow focus:shadow-[0_0_0_1px_rgb(251_191_36_/_0.6),0_0_0_3px_rgb(251_191_36_/_0.18)] dark:bg-white/[0.05] dark:text-gray-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:focus:shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.5)]"
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => {
                if (addLabel.trim()) {
                  onAdd(addLabel.trim(), addIcon);
                  setAddLabel("");
                  setAdding(false);
                }
              }}
              disabled={saving || !addLabel.trim()}
              title="Add"
              className="shrink-0 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={() => { setAddLabel(""); setAdding(false); }}
              title="Cancel"
              className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          </div>
          <p className="mt-1 px-1 font-mono text-[9.5px] text-slate-500 dark:text-slate-400">
            tap icon to cycle • enter to save • esc to cancel
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={saving}
          className="flex w-full items-center gap-1.5 rounded-md border border-dashed border-amber-300/70 bg-white/60 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-amber-50 hover:text-slate-900 disabled:opacity-50 dark:border-amber-400/30 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-amber-500/10 dark:hover:text-slate-100"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-amber-200 text-[11px] font-bold leading-none text-amber-900 dark:bg-amber-400 dark:text-slate-950">+</span>
          Add operation
        </button>
      )}

      {builtInsHidden.length > 0 && (
        <div className="rounded-md border border-slate-200/70 bg-white/40 p-1 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setShowRestore((s) => !s)}
            className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left font-mono text-[9.5px] uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ChevronRight size={9} className={`transition-transform ${showRestore ? "rotate-90" : ""}`} />
            Hidden ({builtInsHidden.length})
          </button>
          {showRestore && (
            <div className="space-y-0.5 px-1 pb-1">
              {builtInsHidden.map((href) => (
                <div key={href} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex-1 truncate font-mono text-[10.5px]">{href}</span>
                  <button
                    type="button"
                    onClick={() => onRestore(href)}
                    disabled={saving}
                    title="Restore"
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300"
                  >
                    <Undo2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center gap-1 px-1.5 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          title="Save renames (Enter)"
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-900 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
        >
          <Check size={12} /> Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          title="Close editor (Esc)"
          className="flex items-center justify-center rounded-md bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-[0_0_0_1px_rgb(15_23_42_/_0.1)] transition-colors hover:bg-slate-50 disabled:opacity-50 dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:hover:bg-white/[0.08]"
        >
          <X size={12} />
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          title="Reset all renames to defaults"
          className="flex items-center justify-center rounded-md bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-[0_0_0_1px_rgb(15_23_42_/_0.1)] transition-colors hover:bg-slate-50 disabled:opacity-50 dark:bg-white/[0.04] dark:text-slate-200 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)] dark:hover:bg-white/[0.08]"
        >
          <Undo2 size={12} />
        </button>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItemDef;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.()}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
        active
          ? "bg-slate-900/90 font-medium text-white shadow-[0_0_0_1px_rgb(15_23_42_/_0.9),0_1px_2px_rgb(15_23_42_/_0.3),inset_0_1px_0_rgb(255_255_255_/_0.08)] dark:bg-white/[0.06] dark:text-gray-50 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.08)]"
          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100"
      }`}
    >
      <Icon size={14} className={active ? "[stroke:url(#nav-icon-gradient)]" : ""} />
      <span className="truncate">{item.label}</span>
      {active && (
        <span
          aria-hidden
          className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-br from-blue-500 to-amber-400 shadow-[0_0_6px_rgb(251_191_36_/_0.6)]"
        />
      )}
    </Link>
  );
}


