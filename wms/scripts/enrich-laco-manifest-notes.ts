/**
 * Enrich Receipt.notes for the LACO-MAIL warehouse with the manifest fields
 * that the receiving page can actually display:
 *
 *   "Box BOX-1024 · Operator BDennis · USPS A1002638129"
 *
 * Source columns from Complete_Mailroom_Datasets_With_Mapping.xlsx » 1_Manifest:
 *   Manifest_ID, Box_ID, PO_Box, Customer_Name, Receive_Date, Manifest_Date,
 *   Manifest_Time, Manifest_EmployeeName, Courier_Company, Tracking_Number
 *
 * Columns intentionally skipped (per the optimization plan):
 *   - PO_Box           constant for LACO ("PO Box 123") → warehouse-level
 *   - Customer_Name    constant for LACO ("LACO")       → warehouse-level
 *   - Manifest_Date    duplicate of Receive_Date (we merge Date + Time into receivedAt)
 *
 * Run:
 *   npx tsx scripts/enrich-laco-manifest-notes.ts
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../.env.local") });

const prisma = new PrismaClient();

const DEFAULT_XLSX = resolve(homedir(), "Downloads", "Complete_Mailroom_Datasets_With_Mapping.xlsx");
const XLSX_PATH = process.argv[2] ?? process.env.MAILROOM_XLSX ?? DEFAULT_XLSX;
const WAREHOUSE_CODE = "LACO-MAIL";

const trim = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length === 0 || s === "[NULL]" ? undefined : s;
};

async function main() {
  if (!existsSync(XLSX_PATH)) {
    throw new Error(`Workbook not found: ${XLSX_PATH}`);
  }
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets["1_Manifest"];
  if (!sheet) throw new Error("Sheet '1_Manifest' not found");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  // Map Manifest_ID → enriched note string (skipping the columns we don't need)
  const notesById = new Map<string, string>();
  for (const r of rows) {
    const mid = trim(r["Manifest_ID"]);
    if (!mid) continue;
    const boxId    = trim(r["Box_ID"]);
    const operator = trim(r["Manifest_EmployeeName"]);
    const carrier  = trim(r["Courier_Company"]) ?? "USPS";
    const tracking = trim(r["Tracking_Number"]);

    const parts = [
      boxId    ? `Box ${boxId}` : null,
      operator ? `Operator ${operator}` : null,
      tracking ? `${carrier} ${tracking}` : carrier,
    ].filter(Boolean);

    notesById.set(mid, parts.join(" · "));
  }

  const warehouse = await prisma.warehouse.findUnique({ where: { code: WAREHOUSE_CODE } });
  if (!warehouse) throw new Error(`Warehouse ${WAREHOUSE_CODE} not found`);

  const receipts = await prisma.receipt.findMany({
    where: { warehouseId: warehouse.id },
    select: { id: true, receiptNumber: true, notes: true },
  });
  console.log(`Found ${receipts.length} receipts under ${WAREHOUSE_CODE}.`);

  let updated = 0;
  let unchanged = 0;
  let unmatched = 0;
  for (const r of receipts) {
    // receiptNumber is "MAIL-RCV-MAN-XXXX" — extract MAN-XXXX
    const m = r.receiptNumber.match(/MAIL-RCV-(MAN-\d+)/);
    const mid = m?.[1];
    if (!mid) { unmatched++; continue; }
    const note = notesById.get(mid);
    if (!note) { unmatched++; continue; }
    if (r.notes === note) { unchanged++; continue; }
    await prisma.receipt.update({ where: { id: r.id }, data: { notes: note } });
    updated++;
  }

  console.log(`Done — updated: ${updated}, unchanged: ${unchanged}, unmatched: ${unmatched}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
