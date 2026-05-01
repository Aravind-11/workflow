"use server";

import * as XLSX from "xlsx";
import { prisma } from "@/server/db/prisma";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import type { WorkflowStage, WorkflowEdge } from "@/lib/workflow/types";
import { Prisma } from "@prisma/client";
import type { WorkflowTemplate } from "@prisma/client";
import { nanoid } from "nanoid";

export type UploadQueueResult = {
  uploadId: string;
  stages: string[];
  totalRows: number;
  skipped: number;
  errors: string[];
};

export async function uploadQueueCsvAction(
  formData: FormData,
): Promise<ActionResult<UploadQueueResult>> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const warehouseId = formData.get("warehouseId") as string | null;
  if (!warehouseId) return { ok: false, error: "Warehouse ID is required" };

  const projectId = (formData.get("projectId") as string | null) || undefined;

  const auth = await guardAction(P.workflow.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty file" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
  if (!rows.length) return { ok: false, error: "No data rows found" };

  function str(v: unknown): string {
    if (v == null) return "";
    return String(v).trim();
  }

  function col(row: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
      const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
      if (v != null && str(v)) return str(v);
    }
    return "";
  }

  // Extract ordered unique stages (preserve first-seen order)
  const stageOrder: string[] = [];
  const stageSeen = new Set<string>();
  for (const row of rows) {
    const q = col(row, "Queue", "queue", "QUEUE", "Stage", "stage");
    if (q && !stageSeen.has(q)) {
      stageSeen.add(q);
      stageOrder.push(q);
    }
  }

  if (!stageOrder.length) {
    return { ok: false, error: "No Queue column found. Expected columns: Pallet, Box Name, Batch, Queue, Operator, Timestamp" };
  }

  const errors: string[] = [];
  let skipped = 0;

  type EntryData = {
    uploadId: string;
    pallet: string;
    boxName: string;
    batch: string;
    queue: string;
    operator: string;
    timestamp: Date;
  };

  const entries: Omit<EntryData, "uploadId">[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const pallet = col(raw, "Pallet", "pallet", "PALLET");
    const boxName = col(raw, "Box Name", "BoxName", "box_name", "box", "Box");
    const batch = col(raw, "Batch", "batch", "BATCH");
    const queue = col(raw, "Queue", "queue", "QUEUE", "Stage", "stage");
    const operator = col(raw, "Operator", "operator", "OPERATOR", "worker", "Worker");
    const tsRaw = col(raw, "Timestamp", "timestamp", "TIMESTAMP", "date", "Date", "time", "Time");

    if (!queue) {
      errors.push(`Row ${rowNum}: missing Queue value`);
      skipped++;
      continue;
    }

    let timestamp: Date;
    try {
      timestamp = tsRaw ? new Date(tsRaw) : new Date();
      if (isNaN(timestamp.getTime())) timestamp = new Date();
    } catch {
      timestamp = new Date();
    }

    entries.push({
      pallet: pallet || "—",
      boxName: boxName || "—",
      batch: batch || "—",
      queue,
      operator: operator || "—",
      timestamp,
    });
  }

  if (!entries.length) {
    return { ok: false, error: `No valid rows found. ${errors.join("; ")}` };
  }

  const upload = await prisma.queueUpload.create({
    data: {
      filename: file.name,
      stages: stageOrder,
      warehouseId,
      projectId: projectId ?? null,
    },
  });

  const BATCH = 500;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH).map((e) => ({
      ...e,
      uploadId: upload.id,
      warehouseId,
    }));
    await prisma.queueEntry.createMany({ data: batch });
  }

  revalidatePath("/workflow");
  return {
    ok: true,
    data: {
      uploadId: upload.id,
      stages: stageOrder,
      totalRows: entries.length,
      skipped,
      errors,
    },
  };
}

export async function deleteQueueUploadAction(uploadId: string): Promise<ActionResult<void>> {
  const upload = await prisma.queueUpload.findUnique({ where: { id: uploadId } });
  if (!upload) return { ok: false, error: "Upload not found" };

  const auth = await guardAction(P.workflow.manage, upload.warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  await prisma.queueEntry.deleteMany({ where: { uploadId } });
  await prisma.queueUpload.delete({ where: { id: uploadId } });
  revalidatePath("/workflow");
  return { ok: true, data: undefined };
}

// ─── WorkflowTemplate CRUD ──────────────────────────────────────────────────

export async function getWorkflowTemplates(
  warehouseId: string,
): Promise<ActionResult<WorkflowTemplate[]>> {
  const guard = await guardAction(P.warehouses.view, warehouseId);
  if (!guard.ok) return guard;

  const templates = await prisma.workflowTemplate.findMany({
    where: { warehouseId },
    orderBy: { updatedAt: "desc" },
  });
  return { ok: true, data: templates };
}

export async function getActiveWorkflow(
  warehouseId: string,
  projectId?: string,
): Promise<ActionResult<WorkflowTemplate | null>> {
  const guard = await guardAction(P.warehouses.view, warehouseId);
  if (!guard.ok) return guard;

  let template = projectId
    ? await prisma.workflowTemplate.findFirst({
        where: { warehouseId, projectId, isActive: true },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  if (!template) {
    template = await prisma.workflowTemplate.findFirst({
      where: { warehouseId, projectId: null, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  return { ok: true, data: template ?? null };
}

export async function saveWorkflow(input: {
  id?: string;
  warehouseId: string;
  projectId?: string;
  name: string;
  stages: WorkflowStage[];
  edges: WorkflowEdge[];
}): Promise<ActionResult<WorkflowTemplate>> {
  const guard = await guardAction(P.warehouses.view, input.warehouseId);
  if (!guard.ok) return guard;

  if (input.id) {
    const existing = await prisma.workflowTemplate.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false, error: "Workflow not found" };

    const updated = await prisma.workflowTemplate.update({
      where: { id: input.id },
      data: {
        name: input.name,
        stages: input.stages as unknown as Prisma.InputJsonValue,
        edges: input.edges as unknown as Prisma.InputJsonValue,
        version: existing.version + 1,
      },
    });
    revalidatePath(`/warehouses/${input.warehouseId}`);
    return { ok: true, data: updated };
  }

  const created = await prisma.workflowTemplate.create({
    data: {
      warehouseId: input.warehouseId,
      projectId: input.projectId ?? null,
      name: input.name,
      stages: input.stages as unknown as Prisma.InputJsonValue,
      edges: input.edges as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath(`/warehouses/${input.warehouseId}`);
  return { ok: true, data: created };
}

export async function activateWorkflow(
  id: string,
): Promise<ActionResult<WorkflowTemplate>> {
  const template = await prisma.workflowTemplate.findUnique({ where: { id } });
  if (!template) return { ok: false, error: "Workflow not found" };

  const guard = await guardAction(P.warehouses.view, template.warehouseId);
  if (!guard.ok) return guard;

  await prisma.workflowTemplate.updateMany({
    where: {
      warehouseId: template.warehouseId,
      projectId: template.projectId ?? null,
      isActive: true,
    },
    data: { isActive: false },
  });

  const activated = await prisma.workflowTemplate.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath(`/warehouses/${template.warehouseId}`);
  revalidatePath("/", "layout");
  return { ok: true, data: activated };
}

export async function deactivateWorkflow(
  id: string,
): Promise<ActionResult> {
  const template = await prisma.workflowTemplate.findUnique({ where: { id } });
  if (!template) return { ok: false, error: "Workflow not found" };

  const guard = await guardAction(P.warehouses.view, template.warehouseId);
  if (!guard.ok) return guard;

  await prisma.workflowTemplate.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/warehouses/${template.warehouseId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWorkflow(id: string): Promise<ActionResult> {
  const template = await prisma.workflowTemplate.findUnique({ where: { id } });
  if (!template) return { ok: false, error: "Workflow not found" };

  const guard = await guardAction(P.warehouses.view, template.warehouseId);
  if (!guard.ok) return guard;

  await prisma.workflowTemplate.delete({ where: { id } });
  revalidatePath(`/warehouses/${template.warehouseId}`);
  return { ok: true };
}

// ─── Barcode generation for queue entries ─────────────────────────────

function datePart(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function generateQueueBarcode(warehouseCode: string, stage: string, pallet: string): string {
  const whTag = warehouseCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const stageTag = stage.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4);
  const palletTag = pallet.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6);
  return `${whTag}-${stageTag}-${palletTag}-${datePart()}-${nanoid(10)}`;
}

async function resolveWarehouseCode(warehouseId: string): Promise<string> {
  const wh = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
    select: { code: true },
  });
  return wh?.code ?? "UNK";
}

export async function generateBarcodesForEntries(
  entryIds: string[],
): Promise<ActionResult<{ generated: number }>> {
  const auth = await guardAction(P.workflow.manage);
  if (!auth.ok) return { ok: false, error: auth.error };

  if (entryIds.length === 0) return { ok: true, data: { generated: 0 } };

  const entries = await prisma.queueEntry.findMany({
    where: { id: { in: entryIds }, barcode: null },
  });

  if (entries.length === 0) return { ok: true, data: { generated: 0 } };

  const whCodeCache = new Map<string, string>();
  for (const entry of entries) {
    let whCode = whCodeCache.get(entry.warehouseId);
    if (!whCode) {
      whCode = await resolveWarehouseCode(entry.warehouseId);
      whCodeCache.set(entry.warehouseId, whCode);
    }
    const barcode = generateQueueBarcode(whCode, entry.queue, entry.pallet);
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { barcode },
    });
  }

  revalidatePath("/workflow");
  return { ok: true, data: { generated: entries.length } };
}

export async function generateBarcodesForStage(
  uploadId: string,
  stage: string,
): Promise<ActionResult<{ generated: number }>> {
  const auth = await guardAction(P.workflow.manage);
  if (!auth.ok) return { ok: false, error: auth.error };

  const entries = await prisma.queueEntry.findMany({
    where: { uploadId, queue: stage, barcode: null },
    select: { id: true, pallet: true, queue: true, warehouseId: true },
  });

  if (entries.length === 0) return { ok: true, data: { generated: 0 } };

  const whCode = await resolveWarehouseCode(entries[0].warehouseId);
  for (const entry of entries) {
    const barcode = generateQueueBarcode(whCode, entry.queue, entry.pallet);
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: { barcode },
    });
  }

  revalidatePath("/workflow");
  return { ok: true, data: { generated: entries.length } };
}

export async function generateBarcodeForEntry(
  entryId: string,
): Promise<ActionResult<{ barcode: string }>> {
  const auth = await guardAction(P.workflow.manage);
  if (!auth.ok) return { ok: false, error: auth.error };

  const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { ok: false, error: "Entry not found" };

  if (entry.barcode) return { ok: true, data: { barcode: entry.barcode } };

  const whCode = await resolveWarehouseCode(entry.warehouseId);
  const barcode = generateQueueBarcode(whCode, entry.queue, entry.pallet);
  await prisma.queueEntry.update({
    where: { id: entryId },
    data: { barcode },
  });

  revalidatePath("/workflow");
  return { ok: true, data: { barcode } };
}
