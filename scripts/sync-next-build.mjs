/**
 * Vercel uses repo root as path0; Next builds into wms/.next. Copy output so the Next builder finds .next/.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = join("wms", ".next");
const dest = ".next";

if (!existsSync(src)) {
  console.error(`sync-next-build: missing ${src} — did next build run?`);
  process.exit(1);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

cpSync(src, dest, { recursive: true });
console.log(`sync-next-build: copied ${src} → ${dest}`);
