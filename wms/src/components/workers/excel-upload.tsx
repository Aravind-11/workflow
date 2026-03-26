"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  bulkImportWorkersAction,
  bulkImportSchedulesAction,
} from "@/features/workers/actions";

type Props = {
  warehouseId: string;
  type: "workers" | "schedules";
};

const EXPECTED_COLUMNS = {
  workers: "firstName, lastName, employeeCode, email (optional), certifications (optional)",
  schedules: "employeeCode, shift, date (YYYY-MM-DD), confirmation (optional)",
} as const;

export function ExcelUpload({ warehouseId, type }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
    else setFileName(null);
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setResult(null);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("warehouseId", warehouseId);
      fd.set("file", file);

      const action =
        type === "workers"
          ? bulkImportWorkersAction
          : bulkImportSchedulesAction;

      const r = await action(fd);
      if (!r.ok) {
        setError(r.error ?? "Upload failed");
      } else {
        setResult(r.data!);
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">
          Import {type} from Excel
        </h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Upload an <span className="font-medium">.xlsx</span> or <span className="font-medium">.csv</span> file.
        Expected columns: <span className="font-medium">{EXPECTED_COLUMNS[type]}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:border-navy-border dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-500/5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {fileName ?? "Choose file…"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </label>

        <Button
          type="button"
          size="sm"
          disabled={!fileName || isPending}
          onClick={handleUpload}
        >
          {isPending ? "Importing…" : "Upload & Import"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-navy-border dark:bg-navy">
          <div className="flex gap-3 text-xs">
            <span className="font-medium text-green-700 dark:text-green-400">
              {result.created} imported
            </span>
            {result.skipped > 0 && (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {result.skipped} skipped
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-400">
              {result.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
