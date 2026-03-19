/** Interval overlap: [a0,a1) vs [b0,b1) — touching endpoints do not overlap */
export function intervalsOverlap(
  a0: Date,
  a1: Date,
  b0: Date,
  b1: Date,
): boolean {
  return a0.getTime() < b1.getTime() && b0.getTime() < a1.getTime();
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function computeTotalWorkedMinutes(
  clockIn: Date,
  clockOut: Date,
  breakMinutes: number,
): number {
  const gross = minutesBetween(clockIn, clockOut);
  return Math.max(0, gross - Math.max(0, breakMinutes));
}

/** Combine a calendar day with "HH:mm" in local time */
export function combineDateAndTime(date: Date, timeHm: string): Date {
  const [h, m] = timeHm.split(":").map((x) => parseInt(x, 10));
  const out = new Date(date);
  out.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return out;
}

export function plannedWindowFromShift(
  scheduleDate: Date,
  startTime: string,
  endTime: string,
  isOvernight: boolean,
): { plannedStart: Date; plannedEnd: Date } {
  const plannedStart = combineDateAndTime(scheduleDate, startTime);
  let plannedEnd = combineDateAndTime(scheduleDate, endTime);
  if (
    isOvernight ||
    plannedEnd.getTime() <= plannedStart.getTime()
  ) {
    plannedEnd = new Date(plannedEnd);
    plannedEnd.setDate(plannedEnd.getDate() + 1);
  }
  return { plannedStart, plannedEnd };
}
