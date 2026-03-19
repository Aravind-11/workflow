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

type Serialized<T> = T extends Date
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
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "MAINTENANCE") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
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
