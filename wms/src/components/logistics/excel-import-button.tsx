"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { excelImportReceivingAction, excelImportPickingAction, excelImportShippingAction } from "@/features/logistics/actions";
import { excelImportSkusAction, excelImportStockAction } from "@/features/inventory/actions";

type Mode = "receiving" | "picking" | "shipping" | "inventory-skus" | "inventory-stock";

type ImportResult = {
  created?: number;
  updated?: number;
  skipped: number;
  errors: string[];
  receiptNumber?: string;
  shipmentNumber?: string;
  pickListNumber?: string;
  shipmentsCreated?: number;
  linesCreated?: number;
  shipmentNumbers?: string[];
};

export function ExcelImportButton({
  warehouseId,
  mode,
  label: labelOverride,
}: {
  warehouseId?: string;
  mode: Mode;
  label?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [carrier, setCarrier] = useState("LA County Logistics");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setErr(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    if (!file) return;
    if (!warehouseId) {
      setErr("No warehouse selected — pick a warehouse before importing.");
      return;
    }
    setPending(true);
    setErr(null);
    setResult(null);

    const fd = new FormData();
    fd.append("warehouseId", warehouseId);
    fd.append("file", file);
    if (mode === "picking") fd.append("carrier", carrier);

    const r = mode === "receiving"
      ? await excelImportReceivingAction(fd)
      : mode === "picking"
        ? await excelImportPickingAction(fd)
        : mode === "shipping"
          ? await excelImportShippingAction(fd)
          : mode === "inventory-skus"
            ? await excelImportSkusAction(fd)
            : await excelImportStockAction(fd);

    setPending(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setResult(r.data as ImportResult);
    router.refresh();
  }

  const label = labelOverride ?? (
    mode === "receiving" ? "Import receipt" :
    mode === "picking" ? "Import scan list" :
    mode === "shipping" ? "Import shipments" :
    mode === "inventory-skus" ? "Import SKUs" :
    "Import stock"
  );
  const accept = ".xlsx,.xls,.csv";

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5"
      >
        <Upload className="h-3.5 w-3.5" />
        {label} from Excel
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-navy-border dark:bg-navy-surface">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-navy-border">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
              </div>
              <button onClick={close} className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {/* Format hint */}
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
                {mode === "receiving" ? (
                  <>
                    <strong>Expected columns:</strong> sku, quantity, lot, batch, condition (GOOD/DAMAGED/HOLD)<br />
                    <span className="mt-0.5 block opacity-75">Also accepts LA County format: projectname, CUSTBOX, Pallet</span>
                  </>
                ) : mode === "picking" ? (
                  <>
                    <strong>Expected columns:</strong> sku, quantity, lot, batch<br />
                    <span className="mt-0.5 block opacity-75">Also accepts LA County format: projectname, CUSTBOX, Pallet — auto-creates shipment + pick list</span>
                  </>
                ) : mode === "inventory-skus" ? (
                  <>
                    <strong>Expected columns:</strong> skuCode/sku, name, barcode, category, uom, reorderPoint<br />
                    <span className="mt-0.5 block opacity-75">Optional: lotTracked, batchTracked, expiryTracked, description — existing SKUs are updated</span>
                  </>
                ) : mode === "inventory-stock" ? (
                  <>
                    <strong>Generic:</strong> sku, quantity, location, lot, batch, expiry<br />
                    <strong>Queue tracking CSV:</strong> Pallet, Box Name, Batch, Queue, Operator, Timestamp<br />
                    <span className="mt-0.5 block opacity-75">Format auto-detected — warehouse uses selected if not in file. Items are auto-created if missing.</span>
                  </>
                ) : (
                  <>
                    <strong>Expected columns:</strong> sku, quantity, carrier, trackingNumber, salesOrderRef<br />
                    <span className="mt-0.5 block opacity-75">LA County format: projectname, CUSTBOX, Pallet — groups by pallet, one shipment per pallet</span>
                  </>
                )}
              </div>

              {/* File picker */}
              {!result ? (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">File (.xlsx, .xls, .csv)</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={accept}
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="mt-1 block w-full cursor-pointer rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700 hover:border-blue-400 dark:border-navy-border dark:bg-navy dark:text-gray-400"
                    />
                  </label>

                  {mode === "picking" && (
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Carrier name</span>
                      <input
                        type="text"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-navy-border dark:bg-navy dark:text-gray-200"
                        placeholder="e.g. FedEx, UPS, LA County Logistics"
                      />
                    </label>
                  )}

                  {err && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {err}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={close}>Cancel</Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={submit}
                      disabled={!file || pending}
                    >
                      {pending ? "Importing…" : "Import"}
                    </Button>
                  </div>
                </>
              ) : (
                /* Result view */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Import complete
                  </div>
                  <div className={`grid gap-2 text-xs ${result.updated != null ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                      <span className="text-gray-500 dark:text-gray-400">{result.shipmentsCreated != null ? "Shipments" : "Created"}</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {result.shipmentsCreated ?? result.created}
                      </p>
                    </div>
                    {result.updated != null && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                        <span className="text-gray-500 dark:text-gray-400">Updated</span>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.updated}</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                      <span className="text-gray-500 dark:text-gray-400">Skipped</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.skipped}</p>
                    </div>
                  </div>
                  {result.shipmentsCreated != null && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {result.linesCreated} lines across {result.shipmentsCreated} shipment{result.shipmentsCreated !== 1 ? "s" : ""}
                    </p>
                  )}
                  {result.shipmentNumbers && result.shipmentNumbers.length > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {result.shipmentNumbers.join(", ")}
                    </p>
                  )}
                  {result.receiptNumber && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">Receipt: <strong>{result.receiptNumber}</strong></p>
                  )}
                  {result.shipmentNumber && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Shipment: <strong>{result.shipmentNumber}</strong> · Pick list: <strong>{result.pickListNumber}</strong>
                    </p>
                  )}
                  {result.errors.length > 0 && (
                    <div className="max-h-28 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-900/20">
                      <p className="mb-1 text-xs font-medium text-amber-800 dark:text-amber-400">Warnings ({result.errors.length})</p>
                      {result.errors.map((e, i) => (
                        <p key={i} className="text-[11px] text-amber-700 dark:text-amber-300">{e}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={reset}>Import another</Button>
                    <Button type="button" size="sm" onClick={close}>Done</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
