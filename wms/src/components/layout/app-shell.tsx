"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { TopRightActions } from "@/components/layout/TopRightActions";
import { VersionWatcher } from "@/components/layout/VersionWatcher";
import type { NavGroupDef } from "@/lib/nav/config";
import type { CustomOp } from "@/lib/nav/state";

/**
 * Responsive shell: mobile drawer nav + desktop fixed sidebar + global Cmd+K.
 */
export function AppShell({
  children,
  navGroups,
  userLabel,
  hasSession,
  warehouseOptions,
  selectedWarehouseId,
  projectOptions,
  selectedProjectId,
  hiddenOps,
  customOps,
  viewMode,
  activeWarehouseLabel,
}: {
  children: React.ReactNode;
  navGroups: NavGroupDef[];
  userLabel: string;
  hasSession: boolean;
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
  const bare =
    path.startsWith("/auth") ||
    path.startsWith("/start") ||
    path === "/unauthorized";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Global Cmd+K / Ctrl+K → toggle command palette.
  useEffect(() => {
    if (!hasSession || bare) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        // Don't hijack browser inputs that might want their own ⌘K (none here, but be safe).
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasSession, bare]);

  if (bare) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!hasSession) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 bg-white/80 px-4 backdrop-blur-xl shadow-[0_1px_0_rgb(15_23_42_/_0.06)] dark:bg-navy/80 dark:shadow-[0_1px_0_rgb(255_255_255_/_0.06)] md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-slate-900 dark:text-gray-100">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-slate-900 to-slate-700 text-[10px] font-bold text-white dark:from-amber-300 dark:to-amber-500 dark:text-slate-950">
            n
          </span>
          nventr
        </span>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] transition-transform duration-200 ease-out md:z-30 md:flex md:w-56 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="relative flex h-full w-full shadow-xl md:shadow-none">
          <button
            type="button"
            className="absolute right-2 top-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar
            navGroups={navGroups}
            userLabel={userLabel}
            onNavigate={() => setMobileOpen(false)}
            warehouseOptions={warehouseOptions}
            selectedWarehouseId={selectedWarehouseId}
            projectOptions={projectOptions}
            selectedProjectId={selectedProjectId}
            hiddenOps={hiddenOps}
            customOps={customOps}
            viewMode={viewMode}
            activeWarehouseLabel={activeWarehouseLabel}
          />
        </div>
      </div>

      <main className="min-h-screen min-w-0 overflow-hidden pt-0 md:ml-56 md:pt-0">
        <div className="mx-auto min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <TopRightActions />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} navGroups={navGroups} />

      <VersionWatcher />
    </>
  );
}
