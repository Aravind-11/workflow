"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/assistant/chat-panel";
import { fmtTime } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Dashboard hero: label, headline (with one-shot word-stagger), search,
 * and a live timestamp pill that cross-fades every 30s.
 *
 * In operator mode the kicker + headline change to the active warehouse
 * so the floor knows exactly what they're looking at.
 */
export function DashboardHero({
  generatedAt,
  viewMode = "admin",
  activeWarehouse = null,
}: {
  generatedAt: string;
  viewMode?: "admin" | "operator";
  activeWarehouse?: { id: string; code: string; name: string } | null;
}) {
  // Render the time only post-hydration: `toLocaleString` resolves locale on
  // the runtime, which differs between the build container (en-US) and the
  // user's browser (en-GB, etc.) — so any first-paint formatted timestamp
  // would crash hydration. We start with `null` on the server and on the
  // client's first paint, then fill in after mount.
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(generatedAt);
    const id = setInterval(() => setNow(new Date().toISOString()), 30_000);
    return () => clearInterval(id);
  }, [generatedAt]);

  const isOperator = viewMode === "operator" && activeWarehouse;
  const kicker = isOperator
    ? `Operator · ${activeWarehouse.code} Floor`
    : "Global Operations · Control Tower";
  const headlineA = isOperator ? "Today on" : "Every box, every dock,";
  const headlineB = isOperator
    ? `${activeWarehouse.name}.`
    : "in one place.";

  return (
    <section className="relative">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
            {kicker}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-gray-50 sm:text-4xl">
            <WordStagger>{headlineA}</WordStagger>
            <br className="hidden sm:block" />
            <WordStagger
              className="text-slate-400 dark:text-slate-500"
              delay={0.2}
            >
              {headlineB}
            </WordStagger>
          </h1>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/5 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live ·{" "}
            <span
              suppressHydrationWarning
              className="inline-block min-w-[5.5ch] text-left tabular-nums"
            >
              <AnimatePresence mode="wait" initial={false}>
                {now ? (
                  <motion.span
                    key={now}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    {fmtTime(now)}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
          </span>
        </div>
      </div>

      <div className="mt-8">
        <SearchBar />
      </div>
    </section>
  );
}

function WordStagger({
  children,
  className = "",
  delay = 0,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  const words = children.split(" ");
  return (
    <span className={`inline-block ${className}`}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ y: "0.4em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: EASE,
            delay: delay + i * 0.06,
          }}
          className="inline-block whitespace-pre"
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}
