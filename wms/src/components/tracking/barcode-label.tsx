"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { buildTrackingUrl } from "@/features/tracking/barcode-utils";

type LabelFormat = "barcode" | "qr" | "both";

interface BarcodeLabelProps {
  barcode: string;
  skuCode?: string;
  description?: string;
  customerName?: string;
  handledBy?: string;
  locationCode?: string;
  timestamp?: string;
  containerType?: string;
  compact?: boolean;
  format?: LabelFormat;
  baseUrl?: string;
}

export function BarcodeLabel({
  barcode,
  skuCode,
  description,
  customerName,
  handledBy,
  locationCode,
  timestamp,
  containerType,
  compact = false,
  format = "both",
  baseUrl,
}: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const showBarcode = format === "barcode" || format === "both";
  const showQr = format === "qr" || format === "both";

  useEffect(() => {
    if (showBarcode && svgRef.current) {
      JsBarcode(svgRef.current, barcode, {
        format: "CODE128",
        width: compact ? 1.2 : 1.5,
        height: compact ? 30 : 45,
        displayValue: true,
        fontSize: compact ? 10 : 12,
        margin: 2,
        textMargin: 1,
      });
    }
  }, [barcode, compact, showBarcode]);

  useEffect(() => {
    if (showQr) {
      const url = buildTrackingUrl(barcode, baseUrl);
      QRCode.toDataURL(url, {
        width: compact ? 64 : 120,
        margin: 1,
        errorCorrectionLevel: "M",
      }).then(setQrDataUrl);
    }
  }, [barcode, baseUrl, compact, showQr]);

  if (compact) {
    return (
      <div className="inline-flex flex-col items-center rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
        {showQr && qrDataUrl && <img src={qrDataUrl} alt={barcode} className="h-16 w-16" />}
        {showBarcode && <svg ref={svgRef} />}
      </div>
    );
  }

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 print:shadow-none print:border-black">
      <div className="flex flex-col items-center gap-2">
        {showQr && qrDataUrl && <img src={qrDataUrl} alt={barcode} className="h-28 w-28" />}
        {showBarcode && <svg ref={svgRef} />}
      </div>
      <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
        {containerType && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Type</span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {containerType}
            </span>
          </div>
        )}
        {skuCode && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">SKU</span>
            <span>{skuCode}</span>
          </div>
        )}
        {description && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Item</span>
            <span className="truncate ml-2 max-w-[180px]">{description}</span>
          </div>
        )}
        {customerName && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Customer</span>
            <span>{customerName}</span>
          </div>
        )}
        {handledBy && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Handler</span>
            <span>{handledBy}</span>
          </div>
        )}
        {locationCode && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Location</span>
            <span>{locationCode}</span>
          </div>
        )}
        {timestamp && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">Date</span>
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
