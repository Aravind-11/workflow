import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract the first string from a Next.js search-param value. */
export function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

/** Deep-clone via JSON round-trip — strips Prisma class instances and converts Dates to strings. */
export function serialize<T>(value: T): Serialized<T> {
  return JSON.parse(JSON.stringify(value));
}

/** Tailwind class string for an entity status badge. */
export function statusBadge(status: string) {
  if (status === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25";
  if (status === "MAINTENANCE")
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25";
  return "bg-slate-100/80 text-slate-600 ring-1 ring-inset ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10";
}

export function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function jsonBrief(v: unknown) {
  if (v == null) return "—";
  try {
    const s = JSON.stringify(v);
    return s.length > 220 ? `${s.slice(0, 220)}…` : s;
  } catch {
    return String(v);
  }
}

export function fmtTime(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtAction(action: string) {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
