"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { NavItemDef } from "@/lib/nav/config";

/**
 * Responsive shell: mobile drawer nav + desktop fixed sidebar.
 */
export function AppShell({
  children,
  navItems,
  userLabel,
  hasSession,
}: {
  children: React.ReactNode;
  navItems: NavItemDef[];
  userLabel: string;
  hasSession: boolean;
}) {
  const path = usePathname();
  const bare = path.startsWith("/auth") || path === "/unauthorized";
  const [mobileOpen, setMobileOpen] = useState(false);

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

  if (bare) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!hasSession) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-gray-900">WMS</span>
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
            className="absolute right-2 top-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar
            navItems={navItems}
            userLabel={userLabel}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      <main className="min-h-screen w-full min-w-0 overflow-x-hidden pt-0 md:ml-56 md:pt-0">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
}
