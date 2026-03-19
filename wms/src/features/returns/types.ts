import type { ReturnDisposition, ReturnStatus } from "@prisma/client";

export type RmaDetail = {
  id: string;
  createdAt: string;
  updatedAt: string;
  rmaNumber: string;
  customerName: string;
  reason: string | null;
  notes: string | null;
  status: ReturnStatus;
  exceptionReasonCode: string | null;
  originalOrderRef: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  warehouseId: string;
  shipmentId: string | null;
  warehouse: { code: string; name: string };
  shipment: null | {
    id: string;
    shipmentNumber: string;
    salesOrderRef: string | null;
    shipmentLines: Array<{
      quantity: number;
      inventoryItem: { skuCode: string; name: string };
    }>;
  };
  lines: Array<{
    id: string;
    quantity: number;
    receivedQty: number;
    dispositionType: ReturnDisposition | null;
    dispositionNote: string | null;
    inventoryAppliedAt: string | null;
    lotNumber: string | null;
    batchNumber: string | null;
    restockLocationId: string | null;
    inventoryItem: { id: string; skuCode: string; name: string };
    restockLocation: { id: string; locationCode: string } | null;
  }>;
  comments: Array<{
    id: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
    user: { fullName: string | null; email: string | null } | null;
  }>;
};

export type Loc = { id: string; locationCode: string; zone: string | null };
export type Sku = { id: string; skuCode: string; name: string };

export type AuditRow = {
  id: string;
  action: string;
  createdAt: string;
  oldValues: unknown;
  newValues: unknown;
};

export const DISPOSITIONS: ReturnDisposition[] = [
  "RESTOCK",
  "REFURBISH",
  "QUARANTINE",
  "SCRAP",
  "RETURN_TO_VENDOR",
];
