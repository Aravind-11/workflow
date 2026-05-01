/**
 * Enrich LACO-MAIL pipeline records (PickList / PackList / Shipment) with the
 * fields from sheets 3_Scan, 4_QC, 5_Export so the picking / packing / shipping
 * pages can show structured columns without schema changes.
 *
 *   PickListLine.batchNumber = "{batchName}"
 *   PickListLine.lotNumber   = "{machine}"      (the scanner machine)
 *   PackListLine.batchNumber = "{batchName}"
 *   PackListLine.lotNumber   = "RESCAN" | "OK"
 *   Shipment.serviceLevel    = "{N} pages exported"
 *   Shipment.trackingNumber  = "{Export_ID}"
 *
 * (Shipment.salesOrderRef was already set to "LACO-{batchName}" by the loader,
 * and PickList.assignedWorker / PackList.assignedWorker were set to the
 * scan op / QC op respectively. We rely on those.)
 *
 * Run:
 *   npx tsx scripts/enrich-laco-pipeline.ts
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
const num = (v: unknown): number | undefined => {
  const t = trim(v);
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const bool = (v: unknown): boolean =>
  v === true || v === 1 || v === "1" ||
  (typeof v === "string" && ["true", "yes", "y"].includes(v.toLowerCase()));

type ScanRow = { machine?: string; pages?: number };
type QcRow = { rescan: boolean };
type ExportRow = { exportId?: string; pages?: number };

async function main() {
  if (!existsSync(XLSX_PATH)) throw new Error(`Workbook not found: ${XLSX_PATH}`);
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });

  const scanSheet = wb.Sheets["3_Scan"];
  const qcSheet = wb.Sheets["4_QC"];
  const exportSheet = wb.Sheets["5_Export"];
  if (!scanSheet || !qcSheet || !exportSheet) {
    throw new Error("Sheets 3_Scan / 4_QC / 5_Export not all found");
  }

  const scanRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(scanSheet, { defval: null });
  const qcRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(qcSheet, { defval: null });
  const exportRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(exportSheet, { defval: null });

  // batchName → latest scan
  const scanByBatch = new Map<string, ScanRow>();
  for (const r of scanRows) {
    const batch = trim(r["Batch_Name"]);
    if (!batch) continue;
    scanByBatch.set(batch, {
      machine: trim(r["Scanner_MachineName"]),
      pages: num(r["Total_Pages_Scanned"]),
    });
  }

  // batchName → latest QC
  const qcByBatch = new Map<string, QcRow>();
  for (const r of qcRows) {
    const batch = trim(r["Batch_Name"]);
    if (!batch) continue;
    qcByBatch.set(batch, { rescan: bool(r["Requires_Rescan"]) });
  }

  // batchName → first export row
  const exportByBatch = new Map<string, ExportRow>();
  for (const r of exportRows) {
    const batch = trim(r["Batch_Name"]);
    if (!batch || exportByBatch.has(batch)) continue;
    exportByBatch.set(batch, {
      exportId: trim(r["Export_ID"]),
      pages: num(r["Total_Images_Exported"]),
    });
  }

  console.log(`Loaded source rows: scans=${scanByBatch.size}  qc=${qcByBatch.size}  exports=${exportByBatch.size}`);

  const wh = await prisma.warehouse.findUnique({ where: { code: WAREHOUSE_CODE } });
  if (!wh) throw new Error(`${WAREHOUSE_CODE} not found`);

  // ---- PickLists ----
  const pickLists = await prisma.pickList.findMany({
    where: { warehouseId: wh.id },
    select: { id: true, shipment: { select: { salesOrderRef: true } }, lines: { select: { id: true } } },
  });
  let pickUpdated = 0;
  let pickSkipped = 0;
  for (const p of pickLists) {
    const ref = p.shipment?.salesOrderRef ?? "";
    const batch = ref.startsWith("LACO-") ? ref.slice(5) : null;
    const scan = batch ? scanByBatch.get(batch) : undefined;
    if (!batch || !scan || p.lines.length === 0) { pickSkipped++; continue; }
    await prisma.pickListLine.update({
      where: { id: p.lines[0].id },
      data: {
        batchNumber: batch,
        lotNumber: scan.machine ?? null,
      },
    });
    pickUpdated++;
  }
  console.log(`PickListLines updated: ${pickUpdated}  skipped: ${pickSkipped}`);

  // ---- PackLists ----
  const packLists = await prisma.packList.findMany({
    where: { warehouseId: wh.id },
    select: { id: true, shipment: { select: { salesOrderRef: true } }, lines: { select: { id: true } } },
  });
  let packUpdated = 0;
  let packSkipped = 0;
  for (const p of packLists) {
    const ref = p.shipment?.salesOrderRef ?? "";
    const batch = ref.startsWith("LACO-") ? ref.slice(5) : null;
    const qc = batch ? qcByBatch.get(batch) : undefined;
    if (!batch || !qc || p.lines.length === 0) { packSkipped++; continue; }
    await prisma.packListLine.update({
      where: { id: p.lines[0].id },
      data: {
        batchNumber: batch,
        lotNumber: qc.rescan ? "RESCAN" : "OK",
      },
    });
    packUpdated++;
  }
  console.log(`PackListLines updated: ${packUpdated}  skipped: ${packSkipped}`);

  // ---- Shipments ----
  const shipments = await prisma.shipment.findMany({
    where: { warehouseId: wh.id },
    select: { id: true, salesOrderRef: true, shipmentNumber: true },
  });
  let shipUpdated = 0;
  let shipSkipped = 0;
  for (const s of shipments) {
    const ref = s.salesOrderRef ?? "";
    const batch = ref.startsWith("LACO-") ? ref.slice(5) : null;
    const ex = batch ? exportByBatch.get(batch) : undefined;
    if (!batch || !ex) { shipSkipped++; continue; }
    await prisma.shipment.update({
      where: { id: s.id },
      data: {
        serviceLevel: ex.pages ? `${ex.pages.toLocaleString()} pages exported` : "Digital archive",
        trackingNumber: ex.exportId ?? null,
      },
    });
    shipUpdated++;
  }
  console.log(`Shipments updated: ${shipUpdated}  skipped: ${shipSkipped}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
