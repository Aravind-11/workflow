"use client";

import { useState } from "react";
import { StageForm } from "./StageForm";
import { executeStageAction } from "@/features/workflow/execute-stage";
import type { WorkflowStage } from "@/lib/workflow/types";
import { Check, AlertTriangle, ArrowRight, Clock } from "lucide-react";

interface StageExecutorProps {
  warehouseId: string;
  projectId?: string;
  stage: WorkflowStage;
  workflowName: string;
}

interface ExecutionResult {
  stageCompleted: boolean;
  taskId?: string;
  trackingItemId?: string;
  itemBarcode?: string;
  eventBarcode?: string;
  nextStages: { type: string; label: string }[];
  requiresApproval: boolean;
  autoAdvanced: boolean;
}

export function StageExecutor({
  warehouseId,
  projectId,
  stage,
  workflowName,
}: StageExecutorProps) {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: Record<string, unknown>) {
    setError(null);
    setResult(null);

    const res = await executeStageAction({
      warehouseId,
      projectId,
      stageType: stage.type,
      formData,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    if (res.data) {
      setResult(res.data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-navy-border dark:bg-navy-surface">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {stage.label}
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
            {workflowName}
          </span>
          {stage.behavior.createsTask && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
              Creates task
            </span>
          )}
          {stage.behavior.generateBarcode && (
            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
              Generates barcode
            </span>
          )}
        </div>

        {stage.entityBinding && (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Bound to entity: <span className="font-medium">{stage.entityBinding}</span>
          </p>
        )}

        <StageForm
          fields={stage.fields}
          behavior={stage.behavior}
          stageLabel={stage.label}
          onSubmit={handleSubmit}
          disabled={!!result}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {result.requiresApproval ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <Clock className="h-5 w-5 flex-shrink-0" />
              Stage submitted and awaiting approval. You will be notified when approved.
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
              <Check className="h-5 w-5 flex-shrink-0" />
              Stage completed successfully.
              {result.itemBarcode && (
                <span className="font-mono text-xs">{result.itemBarcode}</span>
              )}
            </div>
          )}

          {result.taskId && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Task created:{" "}
              <a
                href="/tasks"
                className="font-medium text-blue-700 hover:underline dark:text-blue-400"
              >
                View in Tasks
              </a>
            </p>
          )}

          {result.nextStages.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-border dark:bg-navy-surface">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {result.autoAdvanced ? "Auto-advanced to:" : "Next stages:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {result.nextStages.map((ns) => {
                  const href =
                    ns.type === "receive"
                      ? "/receiving"
                      : ns.type === "pick"
                        ? "/picking"
                        : ns.type === "pack"
                          ? "/packing"
                          : ns.type === "ship"
                            ? "/shipping"
                            : `/stages/${ns.type}`;
                  return (
                    <a
                      key={ns.type}
                      href={href}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:border-navy-border dark:bg-navy dark:text-gray-200 dark:hover:bg-white/5"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      {ns.label}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            Process another item
          </button>
        </div>
      )}
    </div>
  );
}
