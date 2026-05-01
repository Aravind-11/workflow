"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildTrackingUrl } from "@/features/tracking/barcode-utils";

interface QRCodeLabelProps {
  barcode: string;
  baseUrl?: string;
  skuCode?: string;
  description?: string;
  customerName?: string;
  containerType?: string;
  compact?: boolean;
}

export function QRCodeLabel({
  barcode,
  baseUrl,
  skuCode,
  description,
  customerName,
  containerType,
  compact = false,
}: QRCodeLabelProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const url = buildTrackingUrl(barcode, baseUrl);
    QRCode.toDataURL(url, {
      width: compact ? 80 : 160,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl);
  }, [barcode, baseUrl, compact]);

  if (compact) {
    return (
      <div className="inline-flex flex-col items-center rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
        {dataUrl && <img src={dataUrl} alt={barcode} className="h-16 w-16" />}
        <span className="mt-1 text-[10px] font-mono text-gray-500 dark:text-gray-400">
          {barcode}
        </span>
      </div>
    );
  }

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 print:shadow-none print:border-black">
      <div className="flex justify-center">
        {dataUrl && <img src={dataUrl} alt={barcode} className="h-40 w-40" />}
      </div>
      <p className="mt-1 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
        {barcode}
      </p>
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
      </div>
    </div>
  );
}
