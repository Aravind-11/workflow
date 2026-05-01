"use client";

import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Polls /api/build-id every 60s (and on tab focus) and shows a small
 * "New version available" banner when the server's BUILD_ID drifts from
 * what we saw on first load.
 *
 * Why this exists: setting `Cache-Control: no-store` already prevents the
 * browser from caching HTML, but it does not invalidate JS that's already
 * resident in the running tab. After a deploy, an open tab keeps painting
 * the *previous* React tree until the user does a full reload. This banner
 * makes that one-click and visible.
 */
export function VersionWatcher() {
  const initialIdRef = useRef<string | null>(null);
  const [newVersion, setNewVersion] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/build-id", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { buildId?: string };
        if (cancelled || !data.buildId) return;

        if (initialIdRef.current === null) {
          initialIdRef.current = data.buildId;
          return;
        }
        if (data.buildId !== initialIdRef.current) {
          setNewVersion(true);
        }
      } catch {
        // Network blip; we'll try again on the next tick.
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    const onFocus = () => {
      check();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!newVersion || dismissed) return null;

  function reload() {
    window.location.reload();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900/95 px-3 py-2 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl dark:bg-navy-surface/95 dark:ring-white/15"
    >
      <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgb(251_191_36_/_0.8)]" />
      <span className="font-medium">New version available</span>
      <button
        type="button"
        onClick={reload}
        className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
      >
        <RefreshCw size={12} />
        Reload
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={12} />
      </button>
    </div>
  );
}
