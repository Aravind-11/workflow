"use server";

import { ScheduleConfirmation, ScheduleStatus, WorkerStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

export async function bulkImportWorkersAction(
  formData: FormData,
): Promise<ActionResult<{ created: number; skipped: number; errors: string[] }>> {
  const warehouseId = formData.get("warehouseId") as string;
  const file = formData.get("file") as File;

  if (!warehouseId) return { ok: false, error: "Warehouse is required" };
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.workers.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty spreadsheet" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) return { ok: false, error: "No data rows found" };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const firstName = str(raw["firstName"] ?? raw["first_name"] ?? raw["First Name"]);
    const lastName = str(raw["lastName"] ?? raw["last_name"] ?? raw["Last Name"]);
    const employeeCode = str(raw["employeeCode"] ?? raw["employee_code"] ?? raw["Employee Code"] ?? raw["Code"]);
    const email = str(raw["email"] ?? raw["Email"]) || undefined;
    const certsRaw = str(raw["certifications"] ?? raw["Certifications"]);
    const certifications = certsRaw
      ? certsRaw.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    if (!firstName || !lastName) {
      errors.push(`Row ${rowNum}: missing first or last name`);
      skipped++;
      continue;
    }
    if (!employeeCode) {
      errors.push(`Row ${rowNum}: missing employee code`);
      skipped++;
      continue;
    }

    const existing = await prisma.workerProfile.findFirst({
      where: { warehouseId, employeeCode },
    });
    if (existing) {
      errors.push(`Row ${rowNum}: employee code "${employeeCode}" already exists`);
      skipped++;
      continue;
    }

    await prisma.workerProfile.create({
      data: {
        warehouseId,
        firstName,
        lastName,
        employeeCode,
        email,
        status: WorkerStatus.ACTIVE,
        certifications,
      },
    });
    created++;
  }

  revalidateWorkers();
  return { ok: true, data: { created, skipped, errors } };
}

export async function bulkImportSchedulesAction(
  formData: FormData,
): Promise<ActionResult<{ created: number; skipped: number; errors: string[] }>> {
  const warehouseId = formData.get("warehouseId") as string;
  const file = formData.get("file") as File;

  if (!warehouseId) return { ok: false, error: "Warehouse is required" };
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded" };

  const auth = await guardAction(P.workers.manage, warehouseId);
  if (!auth.ok) return { ok: false, error: auth.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty spreadsheet" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) return { ok: false, error: "No data rows found" };

  const shifts = await prisma.shift.findMany({ where: { warehouseId } });
  const workers = await prisma.workerProfile.findMany({
    where: { warehouseId },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  });

  const shiftMap = new Map(shifts.map((s) => [s.name.toLowerCase(), s]));
  const workerMap = new Map(workers.map((w) => [w.employeeCode.toLowerCase(), w]));

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const empCode = str(raw["employeeCode"] ?? raw["employee_code"] ?? raw["Employee Code"] ?? raw["Code"]);
    const shiftName = str(raw["shift"] ?? raw["shiftName"] ?? raw["Shift"] ?? raw["Shift Name"]);
    const dateRaw = raw["date"] ?? raw["Date"] ?? raw["scheduleDate"] ?? raw["Schedule Date"];
    const confirmRaw = str(raw["confirmation"] ?? raw["Confirmation"] ?? raw["status"] ?? raw["Status"]);

    if (!empCode) {
      errors.push(`Row ${rowNum}: missing employee code`);
      skipped++;
      continue;
    }
    if (!shiftName) {
      errors.push(`Row ${rowNum}: missing shift name`);
      skipped++;
      continue;
    }

    const worker = workerMap.get(empCode.toLowerCase());
    if (!worker) {
      errors.push(`Row ${rowNum}: worker "${empCode}" not found`);
      skipped++;
      continue;
    }

    const shift = shiftMap.get(shiftName.toLowerCase());
    if (!shift) {
      errors.push(`Row ${rowNum}: shift "${shiftName}" not found (available: ${shifts.map((s) => s.name).join(", ")})`);
      skipped++;
      continue;
    }

    let scheduleDate: Date;
    if (dateRaw instanceof Date) {
      scheduleDate = new Date(Date.UTC(dateRaw.getFullYear(), dateRaw.getMonth(), dateRaw.getDate()));
    } else {
      const ds = str(dateRaw);
      if (!ds) {
        errors.push(`Row ${rowNum}: missing date`);
        skipped++;
        continue;
      }
      const match = ds.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        scheduleDate = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
      } else {
        const parsed = new Date(ds);
        if (isNaN(parsed.getTime())) {
          errors.push(`Row ${rowNum}: invalid date "${ds}"`);
          skipped++;
          continue;
        }
        scheduleDate = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
      }
    }

    const confirmation = confirmRaw?.toLowerCase().includes("confirm")
      ? ScheduleConfirmation.CONFIRMED
      : ScheduleConfirmation.TENTATIVE;

    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const plannedStart = new Date(scheduleDate);
    plannedStart.setUTCHours(startH, startM, 0, 0);
    const plannedEnd = new Date(scheduleDate);
    plannedEnd.setUTCHours(endH, endM, 0, 0);
    if (plannedEnd <= plannedStart) {
      plannedEnd.setUTCDate(plannedEnd.getUTCDate() + 1);
    }

    try {
      await prisma.schedule.upsert({
        where: {
          workerProfileId_scheduleDate_shiftId: {
            workerProfileId: worker.id,
            scheduleDate,
            shiftId: shift.id,
          },
        },
        create: {
          warehouseId,
          workerProfileId: worker.id,
          shiftId: shift.id,
          scheduleDate,
          status: confirmation === ScheduleConfirmation.CONFIRMED
            ? ScheduleStatus.ASSIGNED
            : ScheduleStatus.PLANNED,
          confirmationStatus: confirmation,
          plannedStart,
          plannedEnd,
        },
        update: {
          confirmationStatus: confirmation,
          plannedStart,
          plannedEnd,
          status: confirmation === ScheduleConfirmation.CONFIRMED
            ? ScheduleStatus.ASSIGNED
            : ScheduleStatus.PLANNED,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "insert failed"}`);
      skipped++;
    }
  }

  revalidateWorkers();
  return { ok: true, data: { created, skipped, errors } };
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}
