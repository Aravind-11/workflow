import type { ReceiptStatus } from "@prisma/client";

export type ReceiptRow = {
  id: string;
  receiptNumber: string;
  status: ReceiptStatus;
  receivedAt: string | Date;
  notes: string | null;
  warehouse: { code: string; name: string };
  purchaseOrder: { poNumber: string } | null;
  delivery: { deliveryNumber: string; status: string } | null;
  lines: { id: string; receivedQty: number; inventoryItem: { skuCode: string } }[];
};

export type PO = {
  id: string;
  poNumber: string;
  lines: { id: string; orderedQty: number; receivedQty: number; inventoryItem: { id: string; skuCode: string; name: string } }[];
};

export type Del = { id: string; deliveryNumber: string; status: string };

export type Wh = { id: string; code: string; name: string };

export type Item = { id: string; skuCode: string; name: string };
