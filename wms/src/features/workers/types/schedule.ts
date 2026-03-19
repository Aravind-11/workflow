import type { ScheduleConfirmation, ShiftType } from "@prisma/client";

export type ShiftRow = { id: string; name: string; startTime: string; endTime: string; shiftType: ShiftType };
export type WorkerMini = { id: string; firstName: string; lastName: string; employeeCode: string };
export type LocMini = { id: string; locationCode: string };
export type SchedRow = {
  id: string;
  shiftId: string;
  scheduleDate: string;
  confirmationStatus: ScheduleConfirmation;
  status: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  workerProfile: WorkerMini;
  shift: ShiftRow;
  location: LocMini | null;
};
