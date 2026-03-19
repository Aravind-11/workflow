import { z } from "zod";
import {
  ScheduleConfirmation,
  ScheduleStatus,
  ShiftType,
  TimeOffStatus,
} from "@prisma/client";

export const createShiftTemplateSchema = z.object({
  warehouseId: z.string().min(1),
  name: z.string().min(1).max(128),
  shiftType: z.nativeEnum(ShiftType),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:mm"),
  isOvernight: z.boolean().optional(),
});

export const assignSchedulesSchema = z.object({
  warehouseId: z.string().min(1),
  shiftId: z.string().min(1),
  /** ISO date string (date part used with warehouse-local day) */
  scheduleDate: z.string().min(1),
  workerIds: z.array(z.string().min(1)).min(1),
  locationId: z.string().optional().nullable(),
  confirmationStatus: z.nativeEnum(ScheduleConfirmation),
});

export const updateScheduleSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().optional().nullable(),
  confirmationStatus: z.nativeEnum(ScheduleConfirmation).optional(),
  plannedStart: z.string().optional().nullable(),
  plannedEnd: z.string().optional().nullable(),
  status: z.nativeEnum(ScheduleStatus).optional(),
  breakMinutes: z.number().int().min(0).max(24 * 60).optional(),
});

export const clockInSchema = z.object({
  scheduleId: z.string().min(1),
});

export const clockOutSchema = z.object({
  scheduleId: z.string().min(1),
});

export const setBreakSchema = z.object({
  scheduleId: z.string().min(1),
  breakMinutes: z.number().int().min(0).max(24 * 60),
});

export const timeOffSchema = z.object({
  workerProfileId: z.string().min(1),
  warehouseId: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
});

export const timeOffStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(TimeOffStatus),
});

export const swapSchedulesSchema = z.object({
  scheduleIdA: z.string().min(1),
  scheduleIdB: z.string().min(1),
});

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type AssignSchedulesInput = z.infer<typeof assignSchedulesSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
