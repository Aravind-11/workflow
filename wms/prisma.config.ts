import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

const quiet = { quiet: true };
config({ path: resolve(process.cwd(), ".env"), ...quiet });
config({ path: resolve(process.cwd(), ".env.local"), override: true, ...quiet });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
