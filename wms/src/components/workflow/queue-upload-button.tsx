"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadQueueCsvAction, deleteQueueUploadAction } from "@/features/workflow/actions";

type UploadResult = {
  uploadId: string;
  stages: string[];
  totalRows: number;
  skipped: number;
  errors: string[];
};

type Props = {
  warehouseId: string;
  existingUploadId?: string;
  existingFilename?: string;
};

export function QueueUploadButton({ warehouseId, existingUploadId, existingFilename }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reset() {
    setFile(null);
    setResult(null);
    setErr(null);
  }

  async function submit() {
    if (!file) return;
    setPending(true);
    setErr(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("warehouseId", warehouseId);
      const r = await uploadQueueCsvAction(fd);
      if (!r.ok) {
        setErr(r.error ?? "Upload failed");
      } else {
        setResult(r.data ?? null);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!existingUploadId) return;
    setDeleting(true);
    await deleteQueueUploadAction(existingUploadId);
    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => { reset(); setOpen(true); }} size="sm" className="flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          {existingUploadId ? "Replace workflow CSV" : "Upload workflow CSV"}
        </Button>
        {existingUploadId && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            {deleting ? "Clearing…" : "Clear"}
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-navy-border dark:bg-navy-surface">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-navy-border">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Upload Workflow CSV</h3>
              <button onClick={() => { setOpen(false); reset(); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Format hint */}
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-300">
                <strong>Expected columns:</strong> Pallet, Box Name, Batch, Queue, Operator, Timestamp
                <span className="mt-0.5 block opacity-75">
                  The Queue column drives the workflow tabs — each unique value becomes a tab.
                </span>
              </div>

              {/* File picker */}
              {!result && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors hover:border-blue-300 hover:bg-blue-50/30 dark:border-navy-border dark:bg-navy dark:hover:border-blue-600"
                >
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  {file ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to choose a CSV or Excel file</p>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {err && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {err}
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Workflow loaded successfully
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                      <span className="text-gray-500 dark:text-gray-400">Rows</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.totalRows}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                      <span className="text-gray-500 dark:text-gray-400">Stages</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.stages.length}</p>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-navy-border dark:bg-navy">
                      <span className="text-gray-500 dark:text-gray-400">Skipped</span>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.skipped}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.stages.map((s, i) => (
                      <span key={s} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <span className="text-blue-400">{i + 1}.</span> {s}
                      </span>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <details className="text-xs text-amber-700 dark:text-amber-400">
                      <summary className="cursor-pointer font-medium">{result.errors.length} rows skipped</summary>
                      <ul className="mt-1 space-y-0.5 pl-3">
                        {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-navy-border">
              <Button variant="outline" size="sm" onClick={() => { setOpen(false); reset(); }}>
                {result ? "Close" : "Cancel"}
              </Button>
              {!result && (
                <Button size="sm" onClick={submit} disabled={!file || pending}>
                  {pending ? "Uploading…" : "Upload & build workflow"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
