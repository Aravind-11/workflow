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

  const docs = await collection.find({ unitCost: { $exists: true }, unitCostCents: { $exists: false } }).toArray();
  console.log(`Found ${docs.length} document(s) to backfill`);

  for (const doc of docs) {
    const cents = Math.round((doc.unitCost as number) * 100);
    await collection.updateOne(
      { _id: doc._id },
      { $set: { unitCostCents: cents }, $unset: { unitCost: "" } },
    );
    console.log(`  ${doc._id}: ${doc.unitCost} → ${cents} cents`);
  }

  console.log("Backfill complete");
}

main()
  .catch(console.error)
  .finally(() => client.close());
