/**
 * Generate Shift / Schedule / DockAppointment / Delivery records for the
 * LACO-MAIL warehouse so the dashboard's "Today's schedules" and
 * "Upcoming docks" sections aren't empty.
 *
 * The mailroom dataset only ships operators, batches and scans — it has
 * no shift / dock data — so we synthesize a believable week:
 *
 *   - Two shifts:  "Day Mailroom"  06:00–14:00, "Swing Mailroom"  14:00–22:00
 *   - For each operator we deterministically pick a shift and schedule
 *     them across yesterday → +3 days.
 *   - For docks, we create 3 inbound (LASD courier, USPS, FedEx) per day
 *     and 1 outbound carrier per day for ±1 day around today.
 *
 * Run:
 *   npx tsx scripts/enrich-laco-shifts-docks.ts
 *
 * Idempotent — wipes prior shifts/schedules/docks/deliveries scoped to
 * LACO-MAIL before re-creating them.
 */

import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeliveryDirection,
  DeliveryStatus,
  DockAppointmentStatus,
  PrismaClient,
  ScheduleConfirmation,
  ScheduleStatus,
  ShiftType,
  WorkerStatus,
} from "@prisma/client";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../.env.local") });
const prisma = new PrismaClient();

const WAREHOUSE_CODE = "LACO-MAIL";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function setTimeOnDay(day: Date, hour: number, minute = 0): Date {
  const x = new Date(day);
  x.setHours(hour, minute, 0, 0);
  return x;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

async function main() {
  const wh = await prisma.warehouse.findUnique({
    where: { code: WAREHOUSE_CODE },
    select: { id: true, name: true },
  });
  if (!wh) throw new Error(`Warehouse ${WAREHOUSE_CODE} not found`);
  console.log(`▸ ${wh.name} (${wh.id})`);

  const workers = await prisma.workerProfile.findMany({
    where: { warehouseId: wh.id, status: WorkerStatus.ACTIVE },
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  });
  console.log(`  workers: ${workers.length}`);
  if (workers.length === 0) {
    console.log("No workers — run load-mailroom-to-wms.ts first.");
    process.exit(0);
  }

  // ──────── Wipe prior synthetic shift/schedule/dock data ────────
  console.log("▸ Wiping prior shifts / schedules / dock appointments…");
  await prisma.schedule.deleteMany({ where: { warehouseId: wh.id } });
  await prisma.delivery.deleteMany({
    where: {
      warehouseId: wh.id,
      // only the synthetic outbound courier — keep loader-created inbound
      // deliveries (those carry receipts).
      deliveryNumber: { startsWith: "DOCK-OUT-" },
    },
  });
  await prisma.dockAppointment.deleteMany({ where: { warehouseId: wh.id } });
  await prisma.shift.deleteMany({ where: { warehouseId: wh.id } });

  // ──────── Shifts ────────
  console.log("▸ Creating shifts…");
  const dayShift = await prisma.shift.create({
    data: {
      warehouseId: wh.id,
      name: "Day Mailroom",
      shiftType: ShiftType.FIRST,
      startTime: "06:00",
      endTime: "14:00",
      isOvernight: false,
      isActive: true,
    },
  });
  const swingShift = await prisma.shift.create({
    data: {
      warehouseId: wh.id,
      name: "Swing Mailroom",
      shiftType: ShiftType.SECOND,
      startTime: "14:00",
      endTime: "22:00",
      isOvernight: false,
      isActive: true,
    },
  });
  console.log(`  ✓ shifts: 2`);

  // ──────── Schedules: yesterday → +3 days ────────
  console.log("▸ Creating schedules…");
  const today = startOfDay(new Date());
  const days: Date[] = [];
  for (let d = -1; d <= 3; d++) {
    const x = new Date(today);
    x.setDate(today.getDate() + d);
    days.push(x);
  }

  let scheduleCount = 0;
  for (const day of days) {
    for (const w of workers) {
      // Deterministic shift pick + day-of-week skip so weekends thin out.
      const dow = day.getDay(); // 0..6
      const isWeekend = dow === 0 || dow === 6;
      const base = hash(`${w.id}-${day.toISOString().slice(0, 10)}`);
      // 80% of operators on a weekday, 30% on a weekend
      const onShift = isWeekend ? base % 100 < 30 : base % 100 < 80;
      if (!onShift) continue;

      const shift = base % 2 === 0 ? dayShift : swingShift;
      const [sh, sm] = shift.startTime.split(":").map(Number);
      const [eh, em] = shift.endTime.split(":").map(Number);
      const plannedStart = setTimeOnDay(day, sh, sm);
      const plannedEnd = setTimeOnDay(day, eh, em);

      const isToday = day.getTime() === today.getTime();
      const isPast = day.getTime() < today.getTime();

      const status: ScheduleStatus = isPast
        ? ScheduleStatus.CLOCKED_OUT
        : isToday
          ? ScheduleStatus.CLOCKED_IN
          : ScheduleStatus.PLANNED;

      await prisma.schedule.create({
        data: {
          warehouseId: wh.id,
          workerProfileId: w.id,
          shiftId: shift.id,
          scheduleDate: day,
          status,
          confirmationStatus: ScheduleConfirmation.CONFIRMED,
          plannedStart,
          plannedEnd,
          actualStart: !isPast && !isToday ? null : plannedStart,
          actualEnd: isPast ? plannedEnd : null,
          breakMinutes: 30,
          totalWorkedMinutes: isPast ? 7 * 60 + 30 : null,
        },
      });
      scheduleCount++;
    }
  }
  console.log(`  ✓ schedules: ${scheduleCount}`);

  // ──────── Dock appointments + outbound deliveries ────────
  console.log("▸ Creating dock appointments…");
  const inboundCarriers = ["LASD-Courier", "USPS", "FedEx"];
  const outboundCarrier = "LASD-Courier";

  let dockCount = 0;
  let outDeliveries = 0;
  // ±1 day window so the dashboard's 3-day horizon picks them up.
  for (let d = -1; d <= 2; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);

    // Inbound — three appointments staggered through the day.
    const inboundTimes: Array<[number, number]> = [
      [7, 30],
      [11, 0],
      [14, 30],
    ];
    for (let i = 0; i < inboundCarriers.length; i++) {
      const carrier = inboundCarriers[i];
      const [h, m] = inboundTimes[i];
      const start = setTimeOnDay(day, h, m);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 60);

      const status: DockAppointmentStatus =
        d < 0
          ? DockAppointmentStatus.COMPLETED
          : d === 0 && start < new Date()
            ? DockAppointmentStatus.IN_PROGRESS
            : DockAppointmentStatus.SCHEDULED;

      const code = `DOCK-IN-${day.toISOString().slice(0, 10)}-${i + 1}`;
      await prisma.dockAppointment.create({
        data: {
          warehouseId: wh.id,
          appointmentCode: code,
          carrier,
          dockDoor: `IN-${i + 1}`,
          scheduledStart: start,
          scheduledEnd: end,
          checkedInAt: status !== DockAppointmentStatus.SCHEDULED ? start : null,
          status,
        },
      });
      dockCount++;
    }

    // Outbound — single courier sweep at end of day.
    const outStart = setTimeOnDay(day, 16, 0);
    const outEnd = setTimeOnDay(day, 17, 0);
    const outStatus: DockAppointmentStatus =
      d < 0
        ? DockAppointmentStatus.COMPLETED
        : DockAppointmentStatus.SCHEDULED;
    const outCode = `DOCK-OUT-${day.toISOString().slice(0, 10)}`;
    const dockOut = await prisma.dockAppointment.create({
      data: {
        warehouseId: wh.id,
        appointmentCode: outCode,
        carrier: outboundCarrier,
        dockDoor: "OUT-1",
        scheduledStart: outStart,
        scheduledEnd: outEnd,
        checkedInAt: outStatus === DockAppointmentStatus.COMPLETED ? outStart : null,
        status: outStatus,
      },
    });
    dockCount++;

    await prisma.delivery.create({
      data: {
        warehouseId: wh.id,
        dockAppointmentId: dockOut.id,
        deliveryNumber: `DOCK-OUT-${day.toISOString().slice(0, 10)}-RUN`,
        direction: DeliveryDirection.OUTBOUND,
        carrier: outboundCarrier,
        status:
          d < 0 ? DeliveryStatus.RELEASED : DeliveryStatus.SCHEDULED,
        scheduledAt: outStart,
        arrivedAt: d < 0 ? outStart : null,
        releasedAt: d < 0 ? outEnd : null,
      },
    });
    outDeliveries++;
  }
  console.log(`  ✓ dock appointments: ${dockCount}, outbound deliveries: ${outDeliveries}`);

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
