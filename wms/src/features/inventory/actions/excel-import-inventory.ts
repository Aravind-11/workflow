"use server";

import * as XLSX from "xlsx";
import { InventoryBalanceStatus, InventoryTransactionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function bool(v: unknown, fallback = false): boolean {
  if (v == null) return fallback;
  const s = str(v).toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "y";
}

function col(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v != null && str(v)) return str(v);
  }
  return "";
}

// ─────────────────────────────────────────────
// SKU CATALOG IMPORT
// Creates or updates InventoryItem records
// Columns: skuCode/sku/SKU, name/Name, barcode, category, uom/UOM,
//          reorderPoint/reorder_point, lotTracked, batchTracked, expiryTracked, description
// ─────────────────────────────────────────────
export async function excelImportSkusAction(
  formData: FormData,
): Promise<ActionResult<{ created: number; updated: number; skipped: number; errors: string[] }>> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.inventory.write);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!rows.length) return { ok: false, error: "No data rows found" };

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const skuCode = col(raw, "skuCode", "sku", "SKU", "SkuCode", "item_code", "ItemCode", "Code");
    const name = col(raw, "name", "Name", "itemName", "item_name", "description", "Description");
    const barcode = col(raw, "barcode", "Barcode", "UPC", "EAN") || null;
    const category = col(raw, "category", "Category", "type", "Type") || null;
    const uom = col(raw, "uom", "UOM", "unit", "Unit", "unitOfMeasure") || "EA";
    const reorderPoint = col(raw, "reorderPoint", "reorder_point", "reorder", "Reorder") || null;
    const description = col(raw, "description", "Description", "notes", "Notes") || null;
    const lotTracked = bool(col(raw, "lotTracked", "lot_tracked", "trackLot"), true);
    const batchTracked = bool(col(raw, "batchTracked", "batch_tracked", "trackBatch"), true);
    const expiryTracked = bool(col(raw, "expiryTracked", "expiry_tracked", "trackExpiry"), false);

    if (!skuCode) {
      errors.push(`Row ${rowNum}: missing SKU code`);
      skipped++;
      continue;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: missing name for SKU "${skuCode}"`);
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.inventoryItem.findFirst({ where: { skuCode } });
      if (existing) {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            name,
            barcode,
            category,
            uom,
            reorderPoint: reorderPoint ? Math.round(num(reorderPoint)) : null,
            description,
            lotTracked,
            batchTracked,
            expiryTracked,
          },
        });
        updated++;
      } else {
        await prisma.inventoryItem.create({
          data: {
            skuCode,
            name,
            barcode,
            category,
            uom,
            reorderPoint: reorderPoint ? Math.round(num(reorderPoint)) : null,
            description,
            lotTracked,
            batchTracked,
            expiryTracked,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(`Row ${rowNum} (${skuCode}): ${e instanceof Error ? e.message : "failed"}`);
      skipped++;
    }
  }

  revalidatePath("/inventory/catalog");
  revalidatePath("/inventory/balances");
  return { ok: true, data: { created, updated, skipped, errors } };
}

type CsvFormat = "generic" | "queue-tracking" | "la-county";

/** Detect which CSV format is being imported */
function detectFormat(rows: Record<string, unknown>[]): CsvFormat {
  if (!rows.length) return "generic";
  const keys = Object.keys(rows[0]).map((k) => k.toLowerCase());
  // LA County: has CUSTBOX column
  if (keys.some((k) => k.includes("custbox"))) return "la-county";
  // Queue tracking: has Box Name + Queue columns
  if (keys.some((k) => k.includes("box name") || k === "box") && keys.some((k) => k === "queue" || k === "stage")) return "queue-tracking";
  return "generic";
}

/** Resolve or auto-create an InventoryItem by skuCode */
async function resolveOrCreateStockItem(
  skuCode: string,
  itemBySku: Map<string, { id: string; skuCode: string }>,
): Promise<{ id: string; skuCode: string }> {
  const key = skuCode.toLowerCase();
  const exact = itemBySku.get(key);
  if (exact) return exact;
  const partial = [...itemBySku.entries()].find(([k]) => k.includes(key) || key.includes(k));
  if (partial) return partial[1];
  const created = await prisma.inventoryItem.create({
    data: { skuCode, name: skuCode, uom: "EA", lotTracked: false, batchTracked: false, expiryTracked: false },
  });
  itemBySku.set(key, created);
  return created;
}

/** Get or auto-create a default "FLOOR / A / 01 / 01" location for a warehouse */
async function getOrCreateDefaultLocation(
  warehouseId: string,
  locCache: Map<string, string>,
): Promise<string> {
  const cached = locCache.get(warehouseId);
  if (cached) return cached;

  const existing = await prisma.warehouseLocationHierarchy.findFirst({
    where: { warehouseId, isActive: true },
    select: { id: true },
  });

  if (existing) {
    locCache.set(warehouseId, existing.id);
    return existing.id;
  }

  // Auto-create a default receiving floor location
  const loc = await prisma.warehouseLocationHierarchy.create({
    data: {
      warehouseId,
      zone: "FLOOR",
      aisle: "A",
      rack: "01",
      bin: "01",
      locationCode: "FLOOR-A-01-01",
      isActive: true,
    },
  });
  locCache.set(warehouseId, loc.id);
  return loc.id;
}

// ─────────────────────────────────────────────
// STOCK BALANCE IMPORT
// Supports 3 auto-detected formats:
//   Generic:       sku, quantity, location, lot, batch, expiry, warehouse
//   Queue tracking: Pallet, Box Name, Batch, Queue, Operator, Timestamp
//   LA County:     projectname, CUSTBOX, Pallet, CUSTBOX Status, ...
// Items and locations are auto-created if missing.
// ─────────────────────────────────────────────
export async function excelImportStockAction(
  formData: FormData,
): Promise<ActionResult<{ created: number; updated: number; skipped: number; errors: string[] }>> {
  const file = formData.get("file") as File | null;
  // Guard: treat "undefined" string or empty as no warehouse
  const rawWhId = str(formData.get("warehouseId"));
  const defaultWarehouseId = rawWhId && rawWhId !== "undefined" ? rawWhId : "";
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.inventory.write, defaultWarehouseId || undefined);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!rows.length) return { ok: false, error: "No data rows found" };

  const format = detectFormat(rows);

  // ── Pre-load reference data ──────────────────────────
  const [allItems, allLocations, allWarehouses] = await Promise.all([
    prisma.inventoryItem.findMany({ select: { id: true, skuCode: true } }),
    prisma.warehouseLocationHierarchy.findMany({ select: { id: true, locationCode: true, warehouseId: true } }),
    prisma.warehouse.findMany({ select: { id: true, code: true } }),
  ]);
  const itemBySku = new Map(allItems.map((i) => [i.skuCode.toLowerCase(), i]));
  const locByCode = new Map(allLocations.map((l) => [l.locationCode.toLowerCase(), l]));
  const whByCode = new Map(allWarehouses.map((w) => [w.code.toLowerCase(), w]));
  // First location per warehouse for fast fallback
  const firstLocByWh = new Map<string, string>();
  for (const l of allLocations) {
    if (!firstLocByWh.has(l.warehouseId)) firstLocByWh.set(l.warehouseId, l.id);
  }
  const createdLocCache = new Map<string, string>();

  // ── Parse all rows first (no DB calls yet) ───────────
  type ParsedRow = {
    rowNum: number;
    skuCode: string;
    quantity: number;
    lotNumber: string | null;
    batchNumber: string | null;
    expiryDate: Date | null;
    whCodeHint: string;
    locCodeHint: string;
  };

  const errors: string[] = [];
  let skipped = 0;
  const parsed: ParsedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;
    let skuCode: string, quantity: number, lotNumber: string | null,
      batchNumber: string | null, expiryDate: Date | null = null,
      whCodeHint: string, locCodeHint: string;

    if (format === "queue-tracking") {
      skuCode = col(raw, "Box Name", "BoxName", "box_name", "box", "Box");
      lotNumber = col(raw, "Pallet", "pallet", "PALLET") || null;
      batchNumber = col(raw, "Batch", "batch", "BATCH") || null;
      quantity = 1;
      whCodeHint = "";
      locCodeHint = "";
    } else if (format === "la-county") {
      // projectname, CUSTBOX, CUSTBOX Status, CUSTBOX LoadedDate, Pallet, Pallet LoadedDate
      skuCode = col(raw, "CUSTBOX", "custbox", "CustBox");
      lotNumber = col(raw, "Pallet", "pallet", "PALLET") || null;
      batchNumber = col(raw, "projectname", "Project Name", "ProjectName") || null;
      quantity = 1;
      whCodeHint = "";
      locCodeHint = "";
    } else {
      skuCode = col(raw, "sku", "SKU", "skuCode", "item", "Item", "itemCode");
      whCodeHint = col(raw, "warehouse", "Warehouse", "warehouseCode", "wh");
      locCodeHint = col(raw, "location", "Location", "locationCode", "bin", "Bin");
      const qtyRaw = col(raw, "quantity", "qty", "Quantity", "onHand", "on_hand", "stock");
      quantity = Math.max(0, Math.round(num(qtyRaw, 0)));
      lotNumber = col(raw, "lot", "Lot", "lotNumber", "lot_number") || null;
      batchNumber = col(raw, "batch", "Batch", "batchNumber", "batch_number") || null;
      const expiryRaw = col(raw, "expiry", "Expiry", "expiryDate", "expiry_date", "expirationDate");
      expiryDate = expiryRaw ? new Date(expiryRaw) : null;
    }

    if (!skuCode) {
      errors.push(`Row ${rowNum}: missing item identifier`);
      skipped++;
      continue;
    }
    if (format === "generic" && quantity <= 0) {
      errors.push(`Row ${rowNum} (${skuCode}): quantity must be > 0`);
      skipped++;
      continue;
    }
    parsed.push({ rowNum, skuCode, quantity, lotNumber, batchNumber, expiryDate, whCodeHint, locCodeHint });
  }

  // ── Bulk auto-create missing inventory items ──────────
  const uniqueSkus = [...new Set(parsed.map((p) => p.skuCode))];
  for (const skuCode of uniqueSkus) {
    if (!itemBySku.has(skuCode.toLowerCase())) {
      const created = await prisma.inventoryItem.create({
        data: { skuCode, name: skuCode, uom: "EA", lotTracked: false, batchTracked: false, expiryTracked: false },
      });
      itemBySku.set(skuCode.toLowerCase(), created);
    }
  }

  // ── Resolve warehouse for each row, collect unique warehouseIds ──
  const resolvedWarehouseIds = new Set<string>();
  for (const p of parsed) {
    const wh = p.whCodeHint ? whByCode.get(p.whCodeHint.toLowerCase()) : null;
    const wid = wh ? wh.id : defaultWarehouseId;
    if (wid) resolvedWarehouseIds.add(wid);
  }

  // ── Auto-create default location for warehouses that have none ──
  for (const wid of resolvedWarehouseIds) {
    if (!firstLocByWh.has(wid)) {
      const loc = await prisma.warehouseLocationHierarchy.upsert({
        where: { warehouseId_zone_aisle_rack_bin: { warehouseId: wid, zone: "FLOOR", aisle: "A", rack: "01", bin: "01" } },
        create: { warehouseId: wid, zone: "FLOOR", aisle: "A", rack: "01", bin: "01", locationCode: "FLOOR-A-01-01", isActive: true },
        update: {},
      });
      firstLocByWh.set(wid, loc.id);
      createdLocCache.set(wid, loc.id);
    }
  }

  // ── Insert / update balances ──────────────────────────
  let created = 0;
  let updated = 0;

  for (const p of parsed) {
    const { rowNum, skuCode, quantity, lotNumber, batchNumber, expiryDate, whCodeHint, locCodeHint } = p;

    const item = itemBySku.get(skuCode.toLowerCase())!;

    const wh = whCodeHint ? whByCode.get(whCodeHint.toLowerCase()) : null;
    const warehouseId = (wh ? wh.id : defaultWarehouseId) || "";
    if (!warehouseId) { errors.push(`Row ${rowNum}: no warehouse`); skipped++; continue; }

    const loc = locCodeHint ? locByCode.get(locCodeHint.toLowerCase()) : null;
    const locationId = loc?.id ?? firstLocByWh.get(warehouseId) ?? "";
    if (!locationId) { errors.push(`Row ${rowNum}: no location`); skipped++; continue; }

    try {
      const existing = await prisma.inventoryBalance.findFirst({
        where: { warehouseId, locationId, inventoryItemId: item.id, lotNumber, batchNumber },
        select: { id: true, onHandQty: true },
      });

      const before = existing?.onHandQty ?? 0;
      const after = quantity;

      const balance = existing
        ? await prisma.inventoryBalance.update({ where: { id: existing.id }, data: { onHandQty: after } })
        : await prisma.inventoryBalance.create({
            data: {
              warehouseId, locationId, inventoryItemId: item.id,
              lotNumber, batchNumber,
              expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : null,
              onHandQty: quantity, reservedQty: 0,
              status: InventoryBalanceStatus.AVAILABLE,
            },
          });

      await prisma.inventoryTransaction.create({
        data: {
          warehouseId, locationId, inventoryItemId: item.id,
          transactionType: InventoryTransactionType.RECEIPT,
          referenceType: "excel-import", referenceId: balance.id,
          lotNumber, batchNumber,
          expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : null,
          quantityBefore: before, quantityDelta: after - before, quantityAfter: after,
          notes: "Imported from Excel",
        },
      });

      existing ? updated++ : created++;
    } catch (e) {
      errors.push(`Row ${rowNum} (${skuCode}): ${e instanceof Error ? e.message : "failed"}`);
      skipped++;
    }
  }

  revalidatePath("/inventory/balances");
  return { ok: true, data: { created, updated, skipped, errors } };
}
