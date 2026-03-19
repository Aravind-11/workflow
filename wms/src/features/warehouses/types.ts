export type WarehouseDirectoryItem = {
  id: string;
  code: string;
  name: string;
  country: string;
  state: string;
  region?: string | null;
  city: string;
  zip: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  capacitySqft?: number | null;
  utilizationPercent?: number | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

export type WarehouseInventorySummaryRow = {
  skuCode: string;
  skuName: string;
  onHandQty: number;
  reservedQty: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
};

export type WarehouseScheduleRow = {
  workerName: string;
  shiftName: string;
  scheduleDate: string;
  status: string;
};

export type WarehouseDeliveryRow = {
  deliveryNumber: string;
  direction: string;
  carrier: string;
  status: string;
  scheduledAt: string;
};

export type WarehouseReceiptRow = {
  receiptNumber: string;
  status: string;
  receivedAt: string;
  supplierName?: string | null;
};

export type WarehouseReturnRow = {
  rmaNumber: string;
  customerName: string;
  status: string;
  receivedAt?: string | null;
};

export type WarehouseTaskRow = {
  title: string;
  taskType: string;
  status: string;
  dueDate?: string | null;
};

export type WarehouseDockAppointmentRow = {
  appointmentCode: string;
  carrier: string;
  dockDoor: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export type WarehouseDetailData = {
  warehouse: WarehouseDirectoryItem;
  inventorySummary: WarehouseInventorySummaryRow[];
  workerSchedule: WarehouseScheduleRow[];
  deliveries: WarehouseDeliveryRow[];
  receipts: WarehouseReceiptRow[];
  returns: WarehouseReturnRow[];
  openTasks: WarehouseTaskRow[];
  dockAppointments: WarehouseDockAppointmentRow[];
};

export type WarehouseDirectoryResponse = {
  warehouses: WarehouseDirectoryItem[];
  facets: {
    countries: string[];
    states: string[];
    regions: string[];
    cities: string[];
  };
};
