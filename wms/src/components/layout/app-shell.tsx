"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { NavItemDef } from "@/lib/nav/config";

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
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (bare || !hasSession) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <>
      <TopBar userLabel={userLabel} onMenuToggle={() => setMobileOpen(true)} />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed left-0 top-14 bottom-0 z-50 w-64 max-w-[85vw] transition-transform duration-200 ease-out md:z-30 md:flex md:w-56 md:max-w-none md:translate-x-0 ${
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
          <Sidebar navItems={navItems} onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <main className="min-h-screen min-w-0 overflow-x-hidden pt-14 md:ml-56">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </>
  );
}
