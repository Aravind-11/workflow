"use server";

import * as XLSX from "xlsx";
import { PickListStatus, ReceiptLineCondition, ReceiptStatus, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidateLogisticsPages, nextDoc } from "./shared";

export type ExcelImportShippingResult = {
  shipmentsCreated: number;
  linesCreated: number;
  skipped: number;
  errors: string[];
  shipmentNumbers: string[];
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown, fallback = 1): number {
  const n = Number(v);
  return isNaN(n) || n <= 0 ? fallback : Math.round(n);
}

function col(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v != null && str(v)) return str(v);
  }
  return "";
}

/** Detect the user's LA County CSV format by checking for CUSTBOX column */
function isLACountyFormat(rows: Record<string, unknown>[]): boolean {
  if (!rows.length) return false;
  const keys = Object.keys(rows[0]);
  return keys.some((k) => k.toLowerCase().includes("custbox") || k.toLowerCase().includes("pallet"));
}

/**
 * Resolve or auto-create an InventoryItem by SKU code.
 * For LA County imports the projectname is used as the SKU — if it doesn't exist yet we create it.
 */
async function resolveOrCreateItem(
  skuCode: string,
  itemBySku: Map<string, { id: string; skuCode: string }>,
): Promise<{ id: string; skuCode: string }> {
  const key = skuCode.toLowerCase();

  // Exact match
  const exact = itemBySku.get(key);
  if (exact) return exact;

  // Partial match
  const partial = [...itemBySku.entries()].find(
    ([k]) => k.includes(key) || key.includes(k),
  );
  if (partial) return partial[1];

  // Auto-create the item so the import is not blocked
  const created = await prisma.inventoryItem.create({
    data: {
      skuCode,
      name: skuCode,
      uom: "EA",
      lotTracked: false,
      batchTracked: false,
      expiryTracked: false,
    },
  });
  itemBySku.set(key, created);
  return created;
}

// ─────────────────────────────────────────────
// RECEIVING IMPORT
// Creates a draft Receipt + ReceiptLines from Excel
// Supported columns:
//   Generic:   sku/SKU, quantity/qty/Quantity, lot, batch, expiry, condition
//   LA County: projectname, CUSTBOX, CUSTBOX Status, CUSTBOX LoadedDate, Pallet, Pallet LoadedDate
// ─────────────────────────────────────────────
export async function excelImportReceivingAction(
  formData: FormData,
): Promise<ActionResult<{ receiptNumber: string; created: number; skipped: number; errors: string[] }>> {
  const warehouseId = str(formData.get("warehouseId"));
  const file = formData.get("file") as File | null;

  if (!warehouseId) return { ok: false, error: "Warehouse required" };
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.receiving.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!rows.length) return { ok: false, error: "No data rows found" };

  // Pre-load all inventory items for this warehouse (by SKU)
  const allItems = await prisma.inventoryItem.findMany({ select: { id: true, skuCode: true, name: true } });
  const itemBySku = new Map(allItems.map((i) => [i.skuCode.toLowerCase(), i]));

  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!wh) return { ok: false, error: "Warehouse not found" };

  const receiptNumber = await nextDoc("RCPT", wh.code);
  const receipt = await prisma.receipt.create({
    data: {
      warehouseId,
      receiptNumber,
      status: ReceiptStatus.DRAFT,
      notes: `Imported from ${file.name}`,
      receivedAt: new Date(),
    },
  });

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  const laFormat = isLACountyFormat(rows);

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    let skuCode: string;
    let quantity: number;
    let lotNumber: string | null;
    let batchNumber: string | null;

    if (laFormat) {
      // LA County CSV: projectname, CUSTBOX, CUSTBOX Status, CUSTBOX LoadedDate, Pallet, Pallet LoadedDate
      skuCode = col(raw, "projectname", "Project Name", "ProjectName");
      const custBox = col(raw, "CUSTBOX", "custbox", "CustBox");
      const pallet = col(raw, "Pallet", "pallet", "PALLET");
      quantity = num(col(raw, "quantity", "Quantity", "qty"), 1);
      lotNumber = custBox || null;
      batchNumber = pallet || null;

      if (!skuCode) {
        // Use CUSTBOX as the SKU if projectname is absent
        skuCode = custBox;
      }
    } else {
      skuCode = col(raw, "sku", "SKU", "skuCode", "SkuCode", "item", "Item", "itemCode");
      quantity = num(col(raw, "quantity", "qty", "Quantity", "Qty", "receivedQty"), 1);
      lotNumber = col(raw, "lot", "Lot", "lotNumber", "lot_number") || null;
      batchNumber = col(raw, "batch", "Batch", "batchNumber", "batch_number") || null;
    }

    if (!skuCode) {
      errors.push(`Row ${rowNum}: missing SKU`);
      skipped++;
      continue;
    }

    const resolvedItem = await resolveOrCreateItem(skuCode, itemBySku);

    const conditionRaw = col(raw, "condition", "Condition").toUpperCase();
    const condition = (["GOOD", "DAMAGED", "HOLD", "REJECTED"] as const).includes(conditionRaw as ReceiptLineCondition)
      ? (conditionRaw as ReceiptLineCondition)
      : ReceiptLineCondition.GOOD;

    await prisma.receiptLine.create({
      data: {
        receiptId: receipt.id,
        inventoryItemId: resolvedItem.id,
        receivedQty: quantity,
        lotNumber,
        batchNumber,
        condition,
      },
    });
    created++;
  }

  revalidateLogisticsPages();
  return { ok: true, data: { receiptNumber, created, skipped, errors } };
}

// ─────────────────────────────────────────────
// PICKING IMPORT
// Creates a Shipment + ShipmentLines + PickList from Excel
// Supported columns:
//   Generic:   sku/SKU, quantity/qty, carrier, trackingNumber, salesOrderRef
//   LA County: projectname, CUSTBOX, Pallet, Pallet LoadedDate
// ─────────────────────────────────────────────
export async function excelImportPickingAction(
  formData: FormData,
): Promise<ActionResult<{ shipmentNumber: string; pickListNumber: string; created: number; skipped: number; errors: string[] }>> {
  const warehouseId = str(formData.get("warehouseId"));
  const file = formData.get("file") as File | null;
  const carrier = str(formData.get("carrier")) || "Imported";

  if (!warehouseId) return { ok: false, error: "Warehouse required" };
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.picking.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!rows.length) return { ok: false, error: "No data rows found" };

  const allItems = await prisma.inventoryItem.findMany({ select: { id: true, skuCode: true, name: true } });
  const itemBySku = new Map(allItems.map((i) => [i.skuCode.toLowerCase(), i]));

  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!wh) return { ok: false, error: "Warehouse not found" };

  const laFormat = isLACountyFormat(rows);

  // Build shipment lines from rows
  const errors: string[] = [];
  let skipped = 0;

  type LineData = { inventoryItemId: string; quantity: number; lotNumber: string | null; batchNumber: string | null };
  const lines: LineData[] = [];

  // For LA County, group by pallet → use as salesOrderRef and batchNumber
  let salesOrderRef: string | null = null;
  let trackingRef: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    let skuCode: string;
    let quantity: number;
    let lotNumber: string | null;
    let batchNumber: string | null;

    if (laFormat) {
      const project = col(raw, "projectname", "Project Name");
      const custBox = col(raw, "CUSTBOX", "custbox", "CustBox");
      const pallet = col(raw, "Pallet", "pallet", "PALLET");
      quantity = num(col(raw, "quantity", "Quantity", "qty"), 1);
      lotNumber = custBox || null;
      batchNumber = pallet || null;
      skuCode = project || custBox;
      if (!salesOrderRef && project) salesOrderRef = project;
      if (!trackingRef && pallet) trackingRef = pallet;
    } else {
      skuCode = col(raw, "sku", "SKU", "skuCode", "item", "Item");
      quantity = num(col(raw, "quantity", "qty", "Quantity"), 1);
      lotNumber = col(raw, "lot", "Lot", "lotNumber") || null;
      batchNumber = col(raw, "batch", "Batch", "batchNumber") || null;
      if (!salesOrderRef) salesOrderRef = col(raw, "salesOrderRef", "order", "Order", "reference") || null;
      if (!trackingRef) trackingRef = col(raw, "trackingNumber", "tracking", "Tracking") || null;
    }

    if (!skuCode) {
      errors.push(`Row ${rowNum}: missing SKU`);
      skipped++;
      continue;
    }

    const resolvedItem = await resolveOrCreateItem(skuCode, itemBySku);
    lines.push({ inventoryItemId: resolvedItem.id, quantity, lotNumber, batchNumber });
  }

  if (!lines.length) {
    return { ok: false, error: `No valid lines found. Errors: ${errors.join("; ")}` };
  }

  // Create shipment
  const shipmentNumber = await nextDoc("SHP", wh.code);
  const shipment = await prisma.shipment.create({
    data: {
      warehouseId,
      shipmentNumber,
      salesOrderRef: salesOrderRef ?? `Import ${file.name}`,
      carrier: carrier,
      serviceLevel: "GROUND",
      trackingNumber: trackingRef ?? null,
      status: ShipmentStatus.CREATED,
      plannedShipAt: null,
      shipmentLines: {
        create: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          quantity: l.quantity,
          lotNumber: l.lotNumber,
          batchNumber: l.batchNumber,
        })),
      },
    },
  });

  // Auto-create pick list
  const pickListNumber = await nextDoc("PICK", wh.code);
  await prisma.pickList.create({
    data: {
      warehouseId,
      shipmentId: shipment.id,
      pickListNumber,
      scheduledDate: new Date(),
      status: PickListStatus.OPEN,
      lines: {
        create: lines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          requestedQty: l.quantity,
          pickedQty: 0,
          lotNumber: l.lotNumber,
          batchNumber: l.batchNumber,
        })),
      },
    },
  });

  revalidateLogisticsPages();
  return {
    ok: true,
    data: { shipmentNumber, pickListNumber, created: lines.length, skipped, errors },
  };
}

// ─────────────────────────────────────────────
// SHIPPING IMPORT
// Groups rows by Pallet (or salesOrderRef) → one Shipment per group
// Supported columns:
//   Generic:   sku/SKU, quantity/qty, carrier, trackingNumber, salesOrderRef, serviceLevel
//   LA County: projectname, CUSTBOX, Pallet — groups by Pallet, one shipment per pallet
// ─────────────────────────────────────────────
export async function excelImportShippingAction(
  formData: FormData,
): Promise<ActionResult<ExcelImportShippingResult>> {
  const warehouseId = str(formData.get("warehouseId"));
  const file = formData.get("file") as File | null;
  const defaultCarrier = str(formData.get("carrier")) || "Imported";

  if (!warehouseId) return { ok: false, error: "Warehouse required" };
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.shipping.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (!rows.length) return { ok: false, error: "No data rows found" };

  const allItems = await prisma.inventoryItem.findMany({ select: { id: true, skuCode: true } });
  const itemBySku = new Map(allItems.map((i) => [i.skuCode.toLowerCase(), i]));

  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!wh) return { ok: false, error: "Warehouse not found" };

  const laFormat = isLACountyFormat(rows);
  const errors: string[] = [];
  let skipped = 0;

  // Group rows into shipments
  // Key = pallet (LA format) or trackingNumber/salesOrderRef (generic) or row index for ungrouped
  type RowGroup = {
    carrier: string;
    trackingNumber: string | null;
    salesOrderRef: string | null;
    serviceLevel: string | null;
    lines: { inventoryItemId: string; quantity: number; lotNumber: string | null; batchNumber: string | null }[];
  };

  const groups = new Map<string, RowGroup>();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    let groupKey: string;
    let skuCode: string;
    let quantity: number;
    let lotNumber: string | null;
    let batchNumber: string | null;
    let carrier: string;
    let trackingNumber: string | null;
    let salesOrderRef: string | null;
    let serviceLevel: string | null;

    if (laFormat) {
      const pallet = col(raw, "Pallet", "pallet", "PALLET");
      const custBox = col(raw, "CUSTBOX", "custbox");
      const project = col(raw, "projectname", "Project Name");
      groupKey = pallet || `row-${i}`;
      skuCode = project || custBox;
      quantity = num(col(raw, "quantity", "qty"), 1);
      lotNumber = custBox || null;
      batchNumber = pallet || null;
      carrier = defaultCarrier;
      trackingNumber = pallet || null;
      salesOrderRef = project || null;
      serviceLevel = "GROUND";
    } else {
      const tracking = col(raw, "trackingNumber", "tracking", "Tracking", "TrackingNumber");
      const orderRef = col(raw, "salesOrderRef", "order", "Order", "reference", "Reference");
      groupKey = tracking || orderRef || `row-${i}`;
      skuCode = col(raw, "sku", "SKU", "skuCode", "item", "Item");
      quantity = num(col(raw, "quantity", "qty", "Quantity"), 1);
      lotNumber = col(raw, "lot", "Lot", "lotNumber") || null;
      batchNumber = col(raw, "batch", "Batch", "batchNumber") || null;
      carrier = col(raw, "carrier", "Carrier") || defaultCarrier;
      trackingNumber = tracking || null;
      salesOrderRef = orderRef || null;
      serviceLevel = col(raw, "serviceLevel", "service", "Service Level") || null;
    }

    if (!skuCode) {
      errors.push(`Row ${rowNum}: missing SKU`);
      skipped++;
      continue;
    }

    const item = await resolveOrCreateItem(skuCode, itemBySku);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { carrier, trackingNumber, salesOrderRef, serviceLevel, lines: [] });
    }
    groups.get(groupKey)!.lines.push({ inventoryItemId: item.id, quantity, lotNumber, batchNumber });
  }

  if (!groups.size) {
    return { ok: false, error: `No valid rows. ${errors.join("; ")}` };
  }

  const shipmentNumbers: string[] = [];
  let linesCreated = 0;

  for (const [, group] of groups) {
    if (!group.lines.length) continue;
    const shipmentNumber = await nextDoc("SHP", wh.code);
    await prisma.shipment.create({
      data: {
        warehouseId,
        shipmentNumber,
        salesOrderRef: group.salesOrderRef,
        carrier: group.carrier,
        serviceLevel: group.serviceLevel,
        trackingNumber: group.trackingNumber,
        status: ShipmentStatus.CREATED,
        plannedShipAt: null,
        shipmentLines: {
          create: group.lines.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantity: l.quantity,
            lotNumber: l.lotNumber,
            batchNumber: l.batchNumber,
          })),
        },
      },
    });
    shipmentNumbers.push(shipmentNumber);
    linesCreated += group.lines.length;
  }

  revalidateLogisticsPages();
  return {
    ok: true,
    data: {
      shipmentsCreated: shipmentNumbers.length,
      linesCreated,
      skipped,
      errors,
      shipmentNumbers,
    },
  };
}
