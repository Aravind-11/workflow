"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ClipboardList,
  Command,
  Send,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type ComponentType } from "react";
import { useHotkeys } from "react-hotkeys-hook";

type Action = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  shortcut: string;
  shortcutPretty: string;
};

const ACTIONS: Action[] = [
  {
    href: "/receiving",
    icon: Truck,
    label: "Start receiving",
    hint: "Receipts & putaway",
    shortcut: "mod+r",
    shortcutPretty: "R",
  },
  {
    href: "/shipping",
    icon: Send,
    label: "Manage shipments",
    hint: "Outbound hub",
    shortcut: "mod+s",
    shortcutPretty: "S",
  },
  {
    href: "/workers/schedules",
    icon: Users,
    label: "Worker schedule",
    hint: "Shifts & coverage",
    shortcut: "mod+w",
    shortcutPretty: "W",
  },
  {
    href: "/tasks",
    icon: ClipboardList,
    label: "Create task",
    hint: "Floor work queue",
    shortcut: "mod+t",
    shortcutPretty: "T",
  },
];

export function QuickActionsRail({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette?: () => void;
}) {
  const router = useRouter();
  const modKey = useModKey();

  // One hotkey registration per action. react-hotkeys-hook normalises
  // `mod+x` to ⌘ on macOS and Ctrl elsewhere automatically.
  useHotkeys(
    ACTIONS[0].shortcut,
    () => router.push(ACTIONS[0].href),
    { preventDefault: true },
    [router],
  );
  useHotkeys(
    ACTIONS[1].shortcut,
    () => router.push(ACTIONS[1].href),
    { preventDefault: true },
    [router],
  );
  useHotkeys(
    ACTIONS[2].shortcut,
    () => router.push(ACTIONS[2].href),
    { preventDefault: true },
    [router],
  );
  useHotkeys(
    ACTIONS[3].shortcut,
    () => router.push(ACTIONS[3].href),
    { preventDefault: true },
    [router],
  );

  return (
    <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        Quick actions
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {ACTIONS.map((a) => (
          <ActionLink key={a.href} action={a} modKey={modKey} />
        ))}

        <hr className="hairline my-1" />

        <button
          type="button"
          onClick={() => onOpenCommandPalette?.()}
          className="group surface relative flex items-center gap-3 px-4 py-3 text-left transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(15_23_42_/_0.12),0_6px_16px_-6px_rgb(15_23_42_/_0.15)] dark:hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_6px_20px_-6px_rgb(0_0_0_/_0.5)]"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 transition-colors group-hover:from-slate-900 group-hover:to-slate-700 group-hover:text-white dark:from-white/[0.06] dark:to-white/[0.02] dark:text-slate-300 dark:group-hover:from-amber-400/30 dark:group-hover:to-amber-500/10 dark:group-hover:text-amber-200"
          >
            <Command className="h-4 w-4" />
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-gray-100">
              Command palette
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Search & jump
            </span>
          </span>
          <Kbd>{modKey}K</Kbd>
        </button>
      </div>
    </aside>
  );
}

function ActionLink({ action, modKey }: { action: Action; modKey: string }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="group surface relative flex items-center gap-3 overflow-hidden px-4 py-3 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgb(15_23_42_/_0.12),0_6px_16px_-6px_rgb(15_23_42_/_0.15)] dark:hover:shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.1),0_6px_20px_-6px_rgb(0_0_0_/_0.5)]"
    >
      <motion.span
        aria-hidden
        initial={{ x: "-120%" }}
        whileHover={{ x: "120%" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/[0.06]"
      />
      <motion.span
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-[1] flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 transition-colors group-hover:from-slate-900 group-hover:to-slate-700 group-hover:text-white dark:from-white/[0.06] dark:to-white/[0.02] dark:text-slate-300 dark:group-hover:from-amber-400/30 dark:group-hover:to-amber-500/10 dark:group-hover:text-amber-200"
      >
        <Icon className="h-4 w-4" />
      </motion.span>
      <span className="relative z-[1] min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          {action.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {action.hint}
        </span>
      </span>
      <Kbd>
        {modKey}
        {action.shortcutPretty}
      </Kbd>
      <ArrowUpRight className="relative z-[1] h-3.5 w-3.5 text-slate-300 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-slate-900 dark:text-slate-600 dark:group-hover:text-gray-100" />
    </Link>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="relative z-[1] hidden shrink-0 items-center rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 sm:inline-flex">
      {children}
    </kbd>
  );
}

/**
 * SSR-safe ⌘ vs Ctrl detection. Renders Ctrl on the server (a safe default for
 * non-Mac users) and swaps to ⌘ on Mac after hydration.
 */
function useModKey(): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => (navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+"),
    () => "Ctrl+",
  );
}
function subscribeNoop() {
  return () => {};
}
