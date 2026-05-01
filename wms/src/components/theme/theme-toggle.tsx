"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-9 w-full" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-all duration-150 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
