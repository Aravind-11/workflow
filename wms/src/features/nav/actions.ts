"use server";

import { revalidatePath } from "next/cache";
import {
  getNavState,
  setNavState,
  slugifyOpLabel,
  type CustomOp,
  type NavLabelOverrides,
  type NavState,
} from "@/lib/nav/state";
import type { NavIconKey } from "@/lib/nav/config";

/**
 * Replace just the labels portion. Pass the full map every time;
 * an empty map clears all renames.
 */
export async function saveNavLabelsAction(labels: NavLabelOverrides): Promise<void> {
  const current = await getNavState();
  await setNavState({ ...current, labels });
  revalidatePath("/", "layout");
}

/** Reset labels only (keeps hidden + custom). */
export async function resetNavLabelsAction(): Promise<void> {
  const current = await getNavState();
  await setNavState({ ...current, labels: {} });
  revalidatePath("/", "layout");
}

/** Replace the entire nav state in one shot. */
export async function saveNavStateAction(next: NavState): Promise<void> {
  await setNavState(next);
  revalidatePath("/", "layout");
}

/**
 * Add a new custom operation tab. Returns the generated href so the
 * caller can navigate or focus it. Idempotent on slug collisions: if a
 * tab with the same href already exists we just update its label/icon.
 */
export async function addCustomOpAction(input: {
  label: string;
  icon: NavIconKey;
}): Promise<{ href: string }> {
  const label = (input.label ?? "").trim().slice(0, 40);
  if (!label) throw new Error("Label is required");
  const slug = slugifyOpLabel(label);
  const baseHref = `/op/${slug}`;

  const current = await getNavState();
  // Generate a unique slug if collision
  let href = baseHref;
  let n = 2;
  while (current.custom.some((c) => c.href === href)) {
    href = `${baseHref}-${n++}`;
    if (n > 50) break;
  }

  const newOp: CustomOp = { href, label, icon: input.icon };
  const next: NavState = {
    ...current,
    custom: [...current.custom, newOp],
    // If the user previously hid this exact href, un-hide it.
    hidden: current.hidden.filter((h) => h !== href),
  };
  await setNavState(next);
  revalidatePath("/", "layout");
  return { href };
}

/**
 * Hide a tab from the OPERATE group. For built-ins this just appends to `hidden`.
 * For custom tabs this both removes them from `custom` AND adds the href to
 * `hidden` so they don't reappear from a stale link.
 */
export async function deleteOpAction(href: string): Promise<void> {
  if (!href || typeof href !== "string") return;
  const current = await getNavState();
  const isCustom = current.custom.some((c) => c.href === href);
  const next: NavState = {
    ...current,
    custom: isCustom ? current.custom.filter((c) => c.href !== href) : current.custom,
    hidden: current.hidden.includes(href) ? current.hidden : [...current.hidden, href],
    // Drop the rename for a deleted item — keeping it would just be cruft.
    labels: Object.fromEntries(
      Object.entries(current.labels).filter(([k]) => k !== href),
    ),
  };
  await setNavState(next);
  revalidatePath("/", "layout");
}

/** Restore a previously deleted built-in tab (no-op for customs, since they're gone). */
export async function restoreOpAction(href: string): Promise<void> {
  if (!href) return;
  const current = await getNavState();
  if (!current.hidden.includes(href)) return;
  await setNavState({ ...current, hidden: current.hidden.filter((h) => h !== href) });
  revalidatePath("/", "layout");
}
