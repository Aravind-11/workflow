"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  Package,
  PackageOpen,
  Pause,
  Puzzle,
  RotateCcw,
  ScanBarcode,
  Send,
  Settings,
  Shield,
  Sliders,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import type { NavGroupDef, NavIconKey } from "@/lib/nav/config";

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

type ExtraAction = {
  href: string;
  label: string;
  hint?: string;
  groupLabel: string;
};

const EXTRA_ACTIONS: ExtraAction[] = [
  { href: "/settings/profile", label: "Customize sidebar", hint: "Hide/show sections", groupLabel: "Settings" },
  { href: "/settings/profile", label: "My profile", groupLabel: "Settings" },
];

export function CommandPalette({
  open,
  onOpenChange,
  navGroups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navGroups: NavGroupDef[];
}) {
  const router = useRouter();

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Stable list of groups+items for render.
  const groups = useMemo(() => {
    return navGroups.map((g) => ({
      ...g,
      items: g.items.map((it) => ({
        ...it,
        // Add the group label to the searchable value so users can type "people workers"
        // and find it.
        searchValue: `${g.label} ${it.label} ${it.href}`,
      })),
    }));
  }, [navGroups]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command menu"
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh]"
    >
      <button
        type="button"
        aria-label="Close command menu"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60"
      />
      <Command
        label="Global command menu"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-navy-surface dark:ring-white/10"
        loop
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-white/10">
          <span aria-hidden className="text-slate-400 dark:text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <Command.Input
            autoFocus
            placeholder="Jump to a page..."
            className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-gray-100 dark:placeholder:text-slate-500"
          />
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 sm:block dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No matches.
          </Command.Empty>

          {groups.map((group) => (
            <Command.Group
              key={group.id}
              heading={group.label}
              className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-400 dark:[&_[cmdk-group-heading]]:text-slate-500"
            >
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <Command.Item
                    key={`${group.id}-${item.href}`}
                    value={item.searchValue}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 aria-selected:bg-slate-900/90 aria-selected:text-white dark:text-gray-200 dark:aria-selected:bg-white/[0.08]"
                  >
                    <Icon size={14} />
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {item.href}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}

          <Command.Group
            heading="Settings"
            className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-slate-400 dark:[&_[cmdk-group-heading]]:text-slate-500"
          >
            {EXTRA_ACTIONS.map((a, i) => (
              <Command.Item
                key={`extra-${i}-${a.label}`}
                value={`${a.groupLabel} ${a.label} ${a.hint ?? ""} ${a.href}`}
                onSelect={() => go(a.href)}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 aria-selected:bg-slate-900/90 aria-selected:text-white dark:text-gray-200 dark:aria-selected:bg-white/[0.08]"
              >
                <Sliders size={14} />
                <span className="truncate">{a.label}</span>
                {a.hint && (
                  <span className="ml-auto truncate text-[11px] text-slate-400 dark:text-slate-500">
                    {a.hint}
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        <div className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-400 dark:border-white/10 dark:text-slate-500">
          <span className="font-mono">↑↓</span> navigate
          <span className="mx-2">·</span>
          <span className="font-mono">↵</span> open
          <span className="mx-2">·</span>
          <span className="font-mono">esc</span> close
        </div>
      </Command>
    </div>
  );
}
