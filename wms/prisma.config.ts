import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

// Prisma skips default .env loading when this file exists; Next.js loads `.env.local`, but
// `dotenv/config` only reads `.env`. Load both so `npx prisma` matches `next dev`.
const quiet = { quiet: true };
config({ path: resolve(process.cwd(), ".env"), ...quiet });
config({ path: resolve(process.cwd(), ".env.local"), override: true, ...quiet });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    directUrl: process.env["DIRECT_URL"],
  },
});
