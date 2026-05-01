"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScanBarcode, Printer } from "lucide-react";
import {
  generateBarcodesForStage,
  generateBarcodeForEntry,
} from "@/features/workflow/actions";
import QRCode from "qrcode";
import { buildTrackingUrl } from "@/features/tracking/barcode-utils";

type QueueEntry = {
  id: string;
  pallet: string;
  boxName: string;
  batch: string;
  queue: string;
  operator: string;
  timestamp: string;
  barcode: string | null;
};

type StageData = {
  stage: string;
  count: number;
  entries: QueueEntry[];
};

type Props = {
  uploadId: string;
  stages: string[];
  stageData: StageData[];
  filename: string;
  uploadedAt: string;
  totalEntries: number;
};

const STAGE_COLORS: Record<string, string> = {
  Manifest: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-700",
  "Strack-BatchCreation": "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700",
  "Move-To-Holding-Area": "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:ring-cyan-700",
  PREP: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700",
  SCAN: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:ring-orange-700",
  Quality: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:ring-teal-700",
  Warehouse: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-700",
  Destroy: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700",
};

const DEFAULT_COLOR =
  "bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:ring-gray-700";

function stageColor(stage: string) {
  return STAGE_COLORS[stage] ?? DEFAULT_COLOR;
}

function InlineQR({ code }: { code: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const url = buildTrackingUrl(code);
    QRCode.toDataURL(url, { width: 48, margin: 1, errorCorrectionLevel: "M" }).then(setSrc);
  }, [code]);

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      {src && <img src={src} alt={code} className="h-10 w-10" />}
      <span className="text-[9px] font-mono text-gray-400 max-w-[100px] truncate">{code}</span>
    </div>
  );
}

async function printQRLabel(code: string, meta: { pallet: string; boxName: string; stage: string; operator: string }) {
  const url = buildTrackingUrl(code);
  const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2, errorCorrectionLevel: "M" });

  const win = window.open("", "_blank", "width=420,height=500");
  if (!win) return;

  win.document.write(`<!DOCTYPE html><html><head><title>QR Label</title>
<style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,sans-serif}
.label{text-align:center;padding:24px}.code{font-family:monospace;font-size:11px;color:#666;margin-top:8px}
.meta{margin-top:12px;font-size:12px;color:#555}.meta strong{color:#111}
@media print{body{min-height:auto}}</style></head>
<body><div class="label">
<img src="${qrDataUrl}" width="160" height="160" />
<div class="code">${code}</div>
<div class="meta">
<div><strong>Stage:</strong> ${meta.stage} &nbsp; <strong>Pallet:</strong> ${meta.pallet}</div>
<div><strong>Box:</strong> ${meta.boxName} &nbsp; <strong>Operator:</strong> ${meta.operator}</div>
</div></div></body></html>`);
  win.document.close();
  win.onload = () => { win.print(); win.close(); };
}

export function QueueStageTabs({ uploadId, stages, stageData, filename, uploadedAt, totalEntries }: Props) {
  const [activeStage, setActiveStage] = useState<string>(stages[0] ?? "");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentData = stageData.find((s) => s.stage === activeStage);

  const filtered = (currentData?.entries ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.boxName.toLowerCase().includes(q) ||
      e.pallet.toLowerCase().includes(q) ||
      e.batch.toLowerCase().includes(q) ||
      e.operator.toLowerCase().includes(q) ||
      (e.barcode && e.barcode.toLowerCase().includes(q))
    );
  });

  const entriesWithoutBarcode = (currentData?.entries ?? []).filter((e) => !e.barcode);

  const handleGenerateAll = () => {
    startTransition(async () => {
      await generateBarcodesForStage(uploadId, activeStage);
    });
  };

  const handleGenerateSingle = (entryId: string) => {
    startTransition(async () => {
      await generateBarcodeForEntry(entryId);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs dark:border-navy-border dark:bg-navy-surface">
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">{filename}</span>
          <span className="ml-2 text-gray-400">·</span>
          <span className="ml-2 text-gray-500 dark:text-gray-400">
            {new Date(uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="ml-auto flex gap-3 text-gray-500 dark:text-gray-400">
          <span><strong className="text-gray-900 dark:text-gray-100">{totalEntries}</strong> total entries</span>
          <span><strong className="text-gray-900 dark:text-gray-100">{stages.length}</strong> stages</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {stageData.map((s, i) => (
          <button
            key={s.stage}
            onClick={() => { setActiveStage(s.stage); setSearch(""); }}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all ${
              activeStage === s.stage
                ? stageColor(s.stage) + " ring-2 shadow-sm"
                : "bg-gray-50 text-gray-600 ring-gray-200 hover:bg-gray-100 dark:bg-navy dark:text-gray-400 dark:ring-navy-border dark:hover:bg-navy-surface"
            }`}
          >
            <span className="text-[10px] opacity-60">{i + 1}.</span>
            {s.stage}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              activeStage === s.stage ? "bg-white/40" : "bg-gray-200 dark:bg-white/10"
            }`}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {currentData && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-navy-border dark:bg-navy-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-navy-border">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${stageColor(activeStage)}`}>
                {activeStage}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{currentData.count} entries</span>
            </div>
            <div className="flex items-center gap-2">
              {entriesWithoutBarcode.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAll}
                  disabled={isPending}
                >
                  <ScanBarcode className="h-3.5 w-3.5 mr-1" />
                  {isPending ? "Generating…" : `Generate All Codes (${entriesWithoutBarcode.length})`}
                </Button>
              )}
              <input
                type="text"
                placeholder="Search box, pallet, barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-navy dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Pallet</th>
                  <th className="px-4 py-2">Box Name</th>
                  <th className="px-4 py-2">Batch</th>
                  <th className="px-4 py-2">Operator</th>
                  <th className="px-4 py-2">Timestamp</th>
                  <th className="px-4 py-2">QR / Barcode</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/60 dark:border-navy-border dark:hover:bg-white/5">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{e.pallet}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-800 dark:text-gray-200">{e.boxName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400">{e.batch}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300">{e.operator}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(e.timestamp).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.barcode ? (
                        <InlineQR code={e.barcode} />
                      ) : (
                        <button
                          onClick={() => handleGenerateSingle(e.id)}
                          disabled={isPending}
                          className="text-[10px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                        >
                          + Generate
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {e.barcode && (
                        <button
                          onClick={() =>
                            printQRLabel(e.barcode!, {
                              pallet: e.pallet,
                              boxName: e.boxName,
                              stage: e.queue,
                              operator: e.operator,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-colors"
                          title="Print QR label"
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                      {search ? `No entries match "${search}"` : "No entries for this stage"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
