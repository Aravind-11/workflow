/**
 * Idempotent script that adds the international demo warehouses (LDN, FRA,
 * MUM, BLR, SGP) to an existing database without touching any other data.
 *
 * Run with:  npx tsx scripts/seed-international-warehouses.ts
 *
 * Safe to re-run — uses upsert keyed on warehouse code.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, "../.env"), quiet: true });
config({ path: resolve(dir, "../.env.local"), override: true, quiet: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INTERNATIONAL_WAREHOUSES = [
  {
    code: "LDN-01",
    name: "London DC",
    country: "GB",
    state: "ENG",
    city: "London",
    region: "Europe",
    zip: "EC1A 1BB",
    timezone: "Europe/London",
    addressLine1: "12 Logistics Square",
  },
  {
    code: "FRA-01",
    name: "Frankfurt Hub",
    country: "DE",
    state: "HE",
    city: "Frankfurt",
    region: "Europe",
    zip: "60311",
    timezone: "Europe/Berlin",
    addressLine1: "47 Hafenstrasse",
  },
  {
    code: "MUM-01",
    name: "Mumbai Fulfillment",
    country: "IN",
    state: "MH",
    city: "Mumbai",
    region: "South Asia",
    zip: "400001",
    timezone: "Asia/Kolkata",
    addressLine1: "88 Trade Center Road",
  },
  {
    code: "BLR-01",
    name: "Bangalore DC",
    country: "IN",
    state: "KA",
    city: "Bangalore",
    region: "South Asia",
    zip: "560001",
    timezone: "Asia/Kolkata",
    addressLine1: "21 Outer Ring Road",
  },
  {
    code: "SGP-01",
    name: "Singapore Gateway",
    country: "SG",
    state: "SG",
    city: "Singapore",
    region: "Southeast Asia",
    zip: "018956",
    timezone: "Asia/Singapore",
    addressLine1: "5 Marina Boulevard",
  },
] as const;

async function main() {
  console.log("Adding international warehouses (idempotent)...\n");

  for (const wh of INTERNATIONAL_WAREHOUSES) {
    const result = await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: {
        name: wh.name,
        country: wh.country,
        state: wh.state,
        city: wh.city,
        region: wh.region,
        zip: wh.zip,
        timezone: wh.timezone,
        addressLine1: wh.addressLine1,
      },
      create: {
        code: wh.code,
        name: wh.name,
        country: wh.country,
        state: wh.state,
        city: wh.city,
        region: wh.region,
        zip: wh.zip,
        timezone: wh.timezone,
        openTime: "06:00",
        closeTime: "22:00",
        addressLine1: wh.addressLine1,
      },
    });
    console.log(`  ✓ ${result.code.padEnd(8)} ${result.name} — ${result.city}, ${result.country}`);
  }

  const total = await prisma.warehouse.count();
  console.log(`\nDone. Total warehouses in database: ${total}`);
}

main()
  .catch((err) => {
    console.error("Failed to add international warehouses:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
