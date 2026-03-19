export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  capacity_sqft?: number;
  open_time?: string;
  close_time?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  active: boolean;
  created_at: string;
}

export interface SKU {
  id: string;
  code: string;
  name: string;
  upc?: string;
  weight_kg?: number;
  uom: string;
  handling_notes?: string;
}

export interface InventoryRow {
  id: string;
  warehouse_id: string;
  location_id?: string;
  sku_id: string;
  quantity: number;
  lot?: string;
  expiry_date?: string;
  status: "available" | "hold" | "damaged";
  skus?: SKU;
  warehouse_locations?: { code: string };
}

export interface Worker {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  certifications?: string[];
  active: boolean;
}

export interface Shift {
  id: string;
  warehouse_id: string;
  name?: string;
  start_time: string;
  end_time: string;
  shift_assignments?: { worker_id: string; workers?: Worker }[];
}

export interface SalesOrder {
  id: string;
  warehouse_id: string;
  order_number: string;
  customer_name?: string;
  ship_by_date?: string;
  status: string;
  carrier?: string;
  tracking?: string;
}

export interface Delivery {
  id: string;
  warehouse_id: string;
  direction: "inbound" | "outbound";
  carrier?: string;
  dock?: string;
  scheduled_at: string;
  status: string;
  manifest_ref?: string;
}

export interface RMA {
  id: string;
  warehouse_id: string;
  rma_number: string;
  customer_name?: string;
  status: string;
  created_at: string;
}
