"use client";

import Link from "next/link";
import { Sliders } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";

/**
 * Floating top-right action cluster: Customize sidebar + Notifications.
 * Shown on every authenticated page (desktop and mobile). Sits over the
 * page content as a translucent pill so it stays accessible without
 * stealing vertical chrome.
 */
export function TopRightActions() {
  return (
    <div className="fixed right-3 top-2 z-40 flex items-center gap-0.5 rounded-xl bg-white/85 p-0.5 shadow-[0_0_0_1px_rgb(15_23_42_/_0.06),0_4px_12px_rgb(15_23_42_/_0.06)] backdrop-blur-xl dark:bg-navy-surface/85 dark:shadow-[0_0_0_1px_rgb(255_255_255_/_0.06),0_4px_12px_rgb(0_0_0_/_0.4)]">
      <Link
        href="/settings/profile"
        aria-label="Customize sidebar"
        title="Customize sidebar"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
      >
        <Sliders size={16} />
      </Link>
      <NotificationBell />
    </div>
  );
}
