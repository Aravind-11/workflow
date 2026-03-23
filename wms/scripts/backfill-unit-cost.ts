/**
 * One-off backfill: convert legacy unitCost (float dollars) → unitCostCents (int).
 * Run once before deploying the schema rename:
 *   npx tsx scripts/backfill-unit-cost.ts
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(dir, "../.env") });
config({ path: resolve(dir, "../.env.local"), override: true });

const uri = process.env.DATABASE_URL;
if (!uri) throw new Error("DATABASE_URL is not set");

const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db();
  const collection = db.collection("PurchaseOrderLine");

  const cursor = collection.find({
    unitCost: { $exists: true, $type: "number" },
    unitCostCents: { $exists: false },
  });

  let count = 0;
  for await (const doc of cursor) {
    const raw = doc.unitCost as number;
    if (!Number.isFinite(raw)) {
      console.warn(`  ${doc._id}: skipping non-finite unitCost (${raw})`);
      continue;
    }
    const cents = Math.round(raw * 100);
    await collection.updateOne(
      { _id: doc._id },
      { $set: { unitCostCents: cents }, $unset: { unitCost: "" } },
    );
    console.log(`  ${doc._id}: ${raw} → ${cents} cents`);
    count++;
  }

  console.log(`Backfill complete — ${count} document(s) converted`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await client.close(); } catch (e) { console.error("Failed to close MongoDB client:", e); }
  });
