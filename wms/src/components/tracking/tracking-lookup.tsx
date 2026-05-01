"use client";

import { useState, useTransition, useCallback } from "react";
import { QRScanInput } from "./qr-scan-input";
import { JourneyTimeline } from "./journey-timeline";
import { BarcodeLabel } from "./barcode-label";
import { PrintLabelButton } from "./print-label-button";
import { lookupBarcode } from "@/features/tracking/lookup-action";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function TrackingLookupClient() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupBarcode>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleScan = (code: string) => {
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await lookupBarcode(code.trim());
        if (!res) {
          setError("No tracking item found for this barcode.");
          setResult(null);
        } else if ("_warehouseMismatch" in res) {
          setError(`This item belongs to warehouse "${res.warehouseCode}". Switch warehouses to view it.`);
          setResult(null);
        } else {
          setResult(res);
        }
      } catch {
        setError("Network error — please try again.");
        setResult(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <QRScanInput
        onScan={handleScan}
        placeholder="Scan QR code or enter barcode…"
        disabled={isPending}
      />

      {isPending && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          Searching…
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={handleClear} className="ml-2 h-6 w-6 p-0 shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {result && !("_warehouseMismatch" in result) && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleClear} className="flex items-center gap-1">
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <BarcodeLabel
                barcode={result.barcode}
                skuCode={result.skuCode}
                description={result.description ?? undefined}
                customerName={result.customerName ?? undefined}
                containerType={result.containerType ?? undefined}
                timestamp={result.createdAt}
                format="both"
              />
              <div className="flex-1 space-y-2 text-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {result.skuCode}
                </h3>
                {result.description && (
                  <p className="text-gray-600 dark:text-gray-400">{result.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Customer: </span>
                    <span className="text-gray-600 dark:text-gray-400">{result.customerName ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Provider: </span>
                    <span className="text-gray-600 dark:text-gray-400">{result.providerName ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Warehouse: </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {result.warehouse.code} — {result.warehouse.name}
                    </span>
                  </div>
                  {result.project && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Project: </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {result.project.code} — {result.project.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <PrintLabelButton
                    barcode={result.barcode}
                    skuCode={result.skuCode}
                    description={result.description ?? undefined}
                    customerName={result.customerName ?? undefined}
                    containerType={result.containerType ?? undefined}
                    format="both"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Tracking Journey
            </h3>
            <JourneyTimeline
              item={result}
              events={result.events}
              containedItems={result.containedItems}
            />
          </div>
        </div>
      )}
    </div>
  );
}
