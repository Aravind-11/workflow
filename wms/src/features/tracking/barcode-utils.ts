import { nanoid } from "nanoid";

function datePart(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * {warehouseCode}-{projectCode}-{YYMMDD}-{nanoid10}
 * e.g. ATL01-LACBJP-260408-Vk3xQ9pR2a
 */
export function generateItemBarcode(warehouseCode: string, projectCode?: string): string {
  const wh = warehouseCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const proj = projectCode ? projectCode.replace(/[^A-Z0-9]/gi, "").toUpperCase() : "GEN";
  return `${wh}-${proj}-${datePart()}-${nanoid(10)}`;
}

/**
 * {itemBarcode}-{stageTag}-{nanoid6}
 * e.g. ATL01-LACBJP-260408-Vk3xQ9pR2a-RECV-a8Bk2q
 *
 * The nanoid suffix prevents collisions when the same item passes
 * through the same stage type more than once (e.g. return + re-pick).
 */
export function generateEventBarcode(itemBarcode: string, stageTag: string): string {
  return `${itemBarcode}-${stageTag}-${nanoid(6)}`;
}

/**
 * Build a tracking URL that resolves when scanned with any QR reader.
 * Falls back to a plain barcode string if no base URL is configured.
 */
export function buildTrackingUrl(barcode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return barcode;
  const clean = base.replace(/\/+$/, "");
  return `${clean}/tracking?code=${encodeURIComponent(barcode)}`;
}
