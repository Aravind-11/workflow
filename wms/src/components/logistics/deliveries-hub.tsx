"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeliveryDirection, DeliveryStatus, DockAppointmentStatus } from "@prisma/client";
import { addWeeks, endOfWeek, format, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { DetailDrawer } from "@/components/logistics/detail-drawer";
import {
  createDeliveryAction,
  createDockAppointmentAction,
  dockCheckInAction,
  updateDeliveryAction,
} from "@/features/logistics/actions";
import type { Wh, Appt, Del } from "@/features/logistics/types/deliveries";
import { DockAppointmentModal } from "./dock-appointment-modal";
import type { DockForm } from "./dock-appointment-modal";
import { InboundDeliveryModal } from "./inbound-delivery-modal";
import type { DeliveryForm } from "./inbound-delivery-modal";

export function DeliveriesHub({
  warehouses,
  warehouseId,
  weekStartIso,
  appointments,
  deliveries,
}: {
  warehouses: Wh[];
  warehouseId: string;
  weekStartIso: string;
  appointments: Appt[];
  deliveries: Del[];
}) {
  const router = useRouter();
  const weekStart = new Date(weekStartIso);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [dockOpen, setDockOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function navigateWeek(delta: number) {
    const t = addWeeks(weekStart, delta);
    const qs = new URLSearchParams();
    qs.set("warehouseId", warehouseId);
    qs.set("week", format(t, "yyyy-MM-dd"));
    router.push(`/deliveries?${qs.toString()}`);
  }

  async function checkIn(id: string) {
    setMsg(null);
    const r = await dockCheckInAction({ id });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  async function patchDelivery(id: string, status: DeliveryStatus) {
    setMsg(null);
    const r = await updateDeliveryAction({
      id,
      status,
      arrivedAt: status === DeliveryStatus.ARRIVED ? new Date().toISOString() : undefined,
    });
    if (!r.ok) setMsg(r.error);
    else router.refresh();
  }

  const selected = deliveries.find((d) => d.id === drawerId);

  return (
    <div className="space-y-6">
      {msg ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{msg}</p>
      ) : null}

      <section className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
        <p className="font-semibold">Dock workflow</p>
        <p className="mt-1">
          Schedule dock → carrier arrives → <strong>check-in</strong> → link inbound delivery → receive
          at door.
        </p>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="text-sm">
            Warehouse
            <select
              name="warehouseId"
              defaultValue={warehouseId}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Week
            <input
              type="date"
              name="week"
              defaultValue={format(weekStart, "yyyy-MM-dd")}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 dark:bg-white/10 dark:text-gray-200"
          >
            Apply
          </button>
        </form>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => navigateWeek(-1)}>
            ← Prev week
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => navigateWeek(1)}>
            Next week →
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setDockOpen(true)}>
          New dock appointment
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setDelOpen(true)}>
          New delivery
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 dark:border-navy-border dark:bg-navy dark:text-gray-300">
          Dock calendar (
          {format(startOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d")} –{" "}
          {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")})
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Door</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs">{a.appointmentCode}</td>
                <td className="px-4 py-3">{a.dockDoor}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {new Date(a.scheduledStart).toLocaleString()} –{" "}
                  {new Date(a.scheduledEnd).toLocaleTimeString()}
                </td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">
                  {a.checkedInAt ? (
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {new Date(a.checkedInAt).toLocaleString()}
                    </span>
                  ) : a.status === DockAppointmentStatus.SCHEDULED ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => checkIn(a.id)}>
                      Check in
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No appointments this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <h2 className="border-b bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 dark:border-navy-border dark:bg-navy dark:text-gray-300">
          Deliveries
        </h2>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 dark:border-navy-border">
                <td className="px-4 py-3 font-mono text-xs">{d.deliveryNumber}</td>
                <td className="px-4 py-3">{d.warehouse.code}</td>
                <td className="px-4 py-3">{d.carrier}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(d.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-blue-700 hover:underline dark:text-blue-400"
                    onClick={() => setDrawerId(d.id)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No deliveries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={!!drawerId}
        title={selected ? `Delivery ${selected.deliveryNumber}` : "Delivery"}
        onClose={() => setDrawerId(null)}
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500 dark:text-gray-400">Direction:</span> {selected.direction}
            </p>
            <p>
              <span className="text-gray-500 dark:text-gray-400">Dock:</span>{" "}
              {selected.dockAppointment
                ? `${selected.dockAppointment.appointmentCode} (${selected.dockAppointment.dockDoor})`
                : "—"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => patchDelivery(selected.id, DeliveryStatus.ARRIVED)}
              >
                Mark arrived
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => patchDelivery(selected.id, DeliveryStatus.IN_PROGRESS)}
              >
                In progress
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => patchDelivery(selected.id, DeliveryStatus.RELEASED)}
              >
                Released
              </Button>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      <DockAppointmentModal
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        onSubmit={async (form: DockForm) => {
          setMsg(null);
          const r = await createDockAppointmentAction({
            warehouseId,
            appointmentCode: form.appointmentCode,
            carrier: form.carrier,
            dockDoor: form.dockDoor,
            scheduledStart: form.scheduledStart,
            scheduledEnd: form.scheduledEnd,
          });
          if (!r.ok) setMsg(r.error);
          else {
            setDockOpen(false);
            router.refresh();
          }
        }}
      />

      <InboundDeliveryModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        appointments={appointments}
        onSubmit={async (form: DeliveryForm) => {
          setMsg(null);
          const r = await createDeliveryAction({
            warehouseId,
            carrier: form.carrier,
            direction: DeliveryDirection.INBOUND,
            scheduledAt: form.scheduledAt,
            dockAppointmentId: form.dockAppointmentId || null,
          });
          if (!r.ok) setMsg(r.error);
          else {
            setDelOpen(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}
