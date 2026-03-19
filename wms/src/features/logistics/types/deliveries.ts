import type { DeliveryStatus, DockAppointmentStatus } from "@prisma/client";

export type Wh = { id: string; code: string; name: string };

export type Appt = {
  id: string;
  appointmentCode: string;
  carrier: string;
  dockDoor: string;
  scheduledStart: string | Date;
  scheduledEnd: string | Date;
  status: DockAppointmentStatus;
  checkedInAt: string | Date | null;
  warehouse: { code: string };
  deliveries: { id: string; deliveryNumber: string; status: DeliveryStatus; direction: string }[];
};

export type Del = {
  id: string;
  deliveryNumber: string;
  direction: string;
  carrier: string;
  status: DeliveryStatus;
  scheduledAt: string | Date;
  arrivedAt: string | Date | null;
  warehouse: { code: string };
  dockAppointment: { appointmentCode: string; dockDoor: string } | null;
};
