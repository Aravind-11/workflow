"use server";

import { ScheduleConfirmation, ScheduleStatus, WorkerStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import { guardAction } from "@/lib/auth/action-guard";
import { P } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { revalidateWorkers } from "./shared";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return { lastName: parts[0], firstName: parts[1] };
  }
  const words = fullName.split(/\s+/);
  return {
    firstName: words.slice(0, -1).join(" ") || words[0],
    lastName: words.length > 1 ? words[words.length - 1] : "",
  };
}

function excelSerialToDate(serial: number): Date {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000);
}

function findBestSheet(
  workbook: XLSX.WorkBook,
  targetColumns: string[],
): XLSX.WorkSheet | null {
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      range: 0,
    });
    if (rows.length === 0) continue;
    const headers = Object.keys(rows[0]);
    const matches = targetColumns.filter((col) =>
      headers.some((h) => h.toLowerCase() === col.toLowerCase()),
    );
    if (matches.length >= 2) return sheet;
  }
  return workbook.Sheets[workbook.SheetNames[0]] ?? null;
}

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

  const locssSheet = findBestSheet(workbook, [
    "FullName", "EmpID", "eTimeID", "JobTitle",
  ]);
  const simpleSheet = findBestSheet(workbook, [
    "firstName", "lastName", "employeeCode",
  ]);

  const sheet = locssSheet ?? simpleSheet ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty spreadsheet" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) return { ok: false, error: "No data rows found" };

  const firstRow = rows[0];
  const isLocss = "FullName" in firstRow || "eTimeID" in firstRow || "EmpID" in firstRow;

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  if (isLocss) {
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const fullName = str(raw["FullName"]);
      const empId = str(raw["EmpID"] ?? raw["eTimeID"]);
      const jobTitle = str(raw["JobTitle"]);

      if (!fullName || !empId) continue;

      const key = empId;
      if (seen.has(key)) continue;
      seen.add(key);

      const { firstName, lastName } = parseName(fullName);
      if (!firstName || !lastName) {
        errors.push(`Worker "${fullName}": cannot parse name`);
        skipped++;
        continue;
      }

      const existing = await prisma.workerProfile.findFirst({
        where: { warehouseId, employeeCode: empId },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const certs: string[] = [];
      if (jobTitle) certs.push(jobTitle);

      await prisma.workerProfile.create({
        data: {
          warehouseId,
          firstName,
          lastName,
          employeeCode: empId,
          status: WorkerStatus.ACTIVE,
          certifications: certs,
        },
      });
      created++;
    }
  } else {
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNum = i + 2;

      const fullNameRaw = str(raw["FullName"] ?? raw["fullName"] ?? raw["Full Name"] ?? raw["name"] ?? raw["Name"]);
      let firstName = str(raw["firstName"] ?? raw["first_name"] ?? raw["First Name"]);
      let lastName = str(raw["lastName"] ?? raw["last_name"] ?? raw["Last Name"]);

      if (!firstName && !lastName && fullNameRaw) {
        const parsed = parseName(fullNameRaw);
        firstName = parsed.firstName;
        lastName = parsed.lastName;
      }

      const employeeCode = str(
        raw["employeeCode"] ?? raw["employee_code"] ?? raw["Employee Code"] ??
        raw["Code"] ?? raw["EmpID"] ?? raw["eTimeID"],
      );
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

  const locssSheet = findBestSheet(workbook, [
    "FullName", "Day", "Hours", "EmpID",
  ]);
  const simpleSheet = findBestSheet(workbook, [
    "employeeCode", "shift", "date",
  ]);

  const sheet = locssSheet ?? simpleSheet ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { ok: false, error: "Empty spreadsheet" };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  if (rows.length === 0) return { ok: false, error: "No data rows found" };

  const shifts = await prisma.shift.findMany({ where: { warehouseId } });
  const workers = await prisma.workerProfile.findMany({
    where: { warehouseId },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  });

  const shiftMap = new Map(shifts.map((s) => [s.name.toLowerCase(), s]));
  const workerByCode = new Map(workers.map((w) => [w.employeeCode.toLowerCase(), w]));
  const workerByName = new Map(
    workers.map((w) => [`${w.lastName}, ${w.firstName}`.toLowerCase(), w]),
  );

  const firstRow = rows[0];
  const isLocss = "FullName" in firstRow && ("Day" in firstRow || "Hours" in firstRow);

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  if (isLocss) {
    const defaultShift = shifts[0];
    if (!defaultShift) {
      return { ok: false, error: "No shifts configured for this warehouse. Create shifts first." };
    }

    type DayAgg = { totalHours: number; tasks: string[] };
    const agg = new Map<string, Map<string, DayAgg>>();

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const fullName = str(raw["FullName"]);
      const empId = str(raw["EmpID"] ?? raw["eTimeID"]);
      const dayRaw = raw["Day"];
      const hours = Number(raw["Hours"] ?? 0);
      const taskDesc = str(raw["TaskDesc"] ?? raw["Locss Classification"]);

      if (!fullName || !dayRaw) continue;

      let dateStr: string;
      if (typeof dayRaw === "number") {
        const d = excelSerialToDate(dayRaw);
        dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      } else if (dayRaw instanceof Date) {
        dateStr = `${dayRaw.getFullYear()}-${String(dayRaw.getMonth() + 1).padStart(2, "0")}-${String(dayRaw.getDate()).padStart(2, "0")}`;
      } else {
        dateStr = str(dayRaw);
      }

      const workerKey = empId || fullName;
      if (!agg.has(workerKey)) agg.set(workerKey, new Map());
      const dayMap = agg.get(workerKey)!;
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, { totalHours: 0, tasks: [] });
      const entry = dayMap.get(dateStr)!;
      entry.totalHours += hours;
      if (taskDesc && !entry.tasks.includes(taskDesc)) entry.tasks.push(taskDesc);
    }

    for (const [workerKey, dayMap] of agg) {
      let worker = workerByCode.get(workerKey.toLowerCase());
      if (!worker) {
        for (const [nameKey, w] of workerByName) {
          if (workerKey.toLowerCase().includes(nameKey) || nameKey.includes(workerKey.toLowerCase())) {
            worker = w;
            break;
          }
        }
      }
      if (!worker) {
        const fullNameLower = workerKey.toLowerCase();
        worker = workers.find((w) => {
          const fwd = `${w.firstName} ${w.lastName}`.toLowerCase();
          const rev = `${w.lastName}, ${w.firstName}`.toLowerCase();
          return fullNameLower.includes(fwd) || fullNameLower.includes(rev) ||
            fwd.includes(fullNameLower) || rev.includes(fullNameLower) ||
            w.employeeCode.toLowerCase() === fullNameLower;
        });
      }

      if (!worker) {
        errors.push(`Worker "${workerKey}" not found in this warehouse. Import workers first.`);
        skipped += dayMap.size;
        continue;
      }

      for (const [dateStr, entry] of dayMap) {
        const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (!match) {
          errors.push(`Worker "${workerKey}": invalid date "${dateStr}"`);
          skipped++;
          continue;
        }

        const scheduleDate = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));

        let bestShift = defaultShift;
        if (entry.totalHours > 0) {
          for (const s of shifts) {
            const [h] = s.startTime.split(":").map(Number);
            if (entry.totalHours > 6 && h < 10) {
              bestShift = s;
              break;
            }
          }
        }

        const [startH, startM] = bestShift.startTime.split(":").map(Number);
        const plannedStart = new Date(scheduleDate);
        plannedStart.setUTCHours(startH, startM, 0, 0);
        const hoursWorked = Math.ceil(entry.totalHours);
        const plannedEnd = new Date(plannedStart.getTime() + hoursWorked * 3600000);

        try {
          await prisma.schedule.upsert({
            where: {
              workerProfileId_scheduleDate_shiftId: {
                workerProfileId: worker.id,
                scheduleDate,
                shiftId: bestShift.id,
              },
            },
            create: {
              warehouseId,
              workerProfileId: worker.id,
              shiftId: bestShift.id,
              scheduleDate,
              status: ScheduleStatus.ASSIGNED,
              confirmationStatus: ScheduleConfirmation.CONFIRMED,
              plannedStart,
              plannedEnd,
              totalWorkedMinutes: Math.round(entry.totalHours * 60),
            },
            update: {
              confirmationStatus: ScheduleConfirmation.CONFIRMED,
              plannedStart,
              plannedEnd,
              status: ScheduleStatus.ASSIGNED,
              totalWorkedMinutes: Math.round(entry.totalHours * 60),
            },
          });
          created++;
        } catch (e) {
          errors.push(`Worker "${workerKey}" ${dateStr}: ${e instanceof Error ? e.message : "insert failed"}`);
          skipped++;
        }
      }
    }
  } else {
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNum = i + 2;

      const empCode = str(
        raw["employeeCode"] ?? raw["employee_code"] ?? raw["Employee Code"] ?? raw["Code"],
      );
      const shiftName = str(
        raw["shift"] ?? raw["shiftName"] ?? raw["Shift"] ?? raw["Shift Name"],
      );
      const dateRaw = raw["date"] ?? raw["Date"] ?? raw["scheduleDate"] ?? raw["Schedule Date"];
      const confirmRaw = str(
        raw["confirmation"] ?? raw["Confirmation"] ?? raw["status"] ?? raw["Status"],
      );

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

      const worker = workerByCode.get(empCode.toLowerCase());
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
  }

  revalidateWorkers();
  return { ok: true, data: { created, skipped, errors } };
}
