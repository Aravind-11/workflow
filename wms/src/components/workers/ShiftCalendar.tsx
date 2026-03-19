import type { Shift } from "@/lib/types";

export default function ShiftCalendar({ shifts }: { shifts: Shift[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 font-medium">Shift Calendar (placeholder)</h3>
      <p className="text-sm text-gray-500">{shifts.length} shifts available for calendar rendering.</p>
    </div>
  );
}
