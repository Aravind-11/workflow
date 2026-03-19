import { Prisma, TimeOffStatus, WorkerStatus } from "@prisma/client";
import { endOfWeek, format, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/server/db/prisma";
import { intervalsOverlap } from "./time";

export type WorkerDirectoryFilters = {
  search?: string;
  warehouseId?: string;
  status?: WorkerStatus;
};

export async function listWorkers(filters: WorkerDirectoryFilters) {
  const search = filters.search?.trim();
  const where: Prisma.WorkerProfileWhereInput = {
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { employeeCode: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.workerProfile.findMany({
    where,
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });

  const roles = await Promise.all(
    rows.map((w) => getPrimaryRoleName(w.userId, w.warehouseId)),
  );

  return rows.map((w, i) => ({
    id: w.id,
    employeeCode: w.employeeCode,
    firstName: w.firstName,
    lastName: w.lastName,
    email: w.email,
    phone: w.phone,
    status: w.status,
    warehouse: w.warehouse,
    roleName: roles[i],
  }));
}

async function getPrimaryRoleName(userId: string | null, warehouseId: string) {
  if (!userId) return null;
  const ur = await prisma.userRole.findFirst({
    where: { userId, warehouseId },
    include: { role: { select: { name: true } } },
    orderBy: { role: { name: "asc" } },
  });
  return ur?.role.name ?? null;
}

export async function getWorkerDetail(workerId: string) {
  const worker = await prisma.workerProfile.findUnique({
    where: { id: workerId },
    include: {
      warehouse: true,
      user: { select: { id: true, email: true, fullName: true } },
    },
  });
  if (!worker) return null;

  const roleName = await getPrimaryRoleName(worker.userId, worker.warehouseId);

  const today = startOfDay(new Date());

  const [tasks, upcomingSchedules, timeOff, recentSchedules, todaySchedules] = await Promise.all([
    prisma.task.findMany({
      where: { workerProfileId: workerId },
      orderBy: { dueDate: "asc" },
      take: 25,
      include: {
        warehouse: { select: { code: true, name: true } },
        location: { select: { locationCode: true } },
      },
    }),
    prisma.schedule.findMany({
      where: {
        workerProfileId: workerId,
        scheduleDate: { gte: startOfWeek(new Date(), { weekStartsOn: 1 }) },
      },
      orderBy: [{ scheduleDate: "asc" }, { plannedStart: "asc" }],
      take: 20,
      include: {
        shift: true,
        warehouse: { select: { code: true, name: true } },
        location: { select: { locationCode: true, zone: true } },
      },
    }),
    prisma.timeOffBlock.findMany({
      where: { workerProfileId: workerId },
      orderBy: { startAt: "desc" },
      take: 15,
    }),
    prisma.schedule.findMany({
      where: { workerProfileId: workerId },
      orderBy: { scheduleDate: "desc" },
      take: 15,
      include: { shift: true },
    }),
    prisma.schedule.findMany({
      where: { workerProfileId: workerId },
      include: {
        shift: true,
        warehouse: { select: { code: true } },
        location: { select: { locationCode: true } },
      },
      orderBy: { plannedStart: "asc" },
    }),
  ]);

  const todays = todaySchedules.filter(
    (s) => format(s.scheduleDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
  );

  return {
    worker,
    roleName,
    tasks,
    upcomingSchedules,
    timeOff,
    recentSchedules,
    todaySchedules: todays,
  };
}

export async function listWarehouseOptions() {
  return prisma.warehouse.findMany({
    select: { id: true, code: true, name: true, timezone: true },
    orderBy: { code: "asc" },
  });
}

export async function listShiftsForWarehouse(warehouseId: string) {
  return prisma.shift.findMany({
    where: { warehouseId, isActive: true },
    orderBy: { startTime: "asc" },
  });
}

export async function listLocationsForWarehouse(warehouseId: string) {
  return prisma.warehouseLocationHierarchy.findMany({
    where: { warehouseId, isActive: true },
    select: { id: true, locationCode: true, zone: true },
    orderBy: { locationCode: "asc" },
    take: 500,
  });
}

export async function listWorkersForWarehouse(warehouseId: string) {
  return prisma.workerProfile.findMany({
    where: { warehouseId, status: WorkerStatus.ACTIVE },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  });
}

export type WeekQuery = { warehouseId: string; weekStart: Date };

export async function listSchedulesForWeek({ warehouseId, weekStart }: WeekQuery) {
  const ws = startOfWeek(weekStart, { weekStartsOn: 1 });
  const we = endOfWeek(weekStart, { weekStartsOn: 1 });

  const schedules = await prisma.schedule.findMany({
    where: {
      warehouseId,
      scheduleDate: { gte: ws, lte: we },
    },
    include: {
      workerProfile: {
        select: { id: true, firstName: true, lastName: true, employeeCode: true },
      },
      shift: true,
      location: { select: { id: true, locationCode: true } },
    },
    orderBy: [{ scheduleDate: "asc" }, { plannedStart: "asc" }],
  });

  return { weekStart: ws, weekEnd: we, schedules };
}

/** Schedules for same worker with planned window — excluding given rows (e.g. swap pair) */
export async function findConflictingSchedules(
  workerProfileId: string,
  plannedStart: Date,
  plannedEnd: Date,
  excludeScheduleIds: string[] = [],
) {
  const others = await prisma.schedule.findMany({
    where: {
      workerProfileId,
      id: excludeScheduleIds.length ? { notIn: excludeScheduleIds } : undefined,
      plannedStart: { not: null },
      plannedEnd: { not: null },
    },
    select: { id: true, plannedStart: true, plannedEnd: true, shift: { select: { name: true } } },
  });

  return others.filter((o) => {
    if (!o.plannedStart || !o.plannedEnd) return false;
    return intervalsOverlap(plannedStart, plannedEnd, o.plannedStart, o.plannedEnd);
  });
}

export async function findApprovedTimeOffConflicts(
  workerProfileId: string,
  plannedStart: Date,
  plannedEnd: Date,
) {
  return prisma.timeOffBlock.findMany({
    where: {
      workerProfileId,
      status: TimeOffStatus.APPROVED,
      AND: [{ startAt: { lt: plannedEnd } }, { endAt: { gt: plannedStart } }],
    },
  });
}
