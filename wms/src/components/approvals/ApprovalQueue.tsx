"use client";

import { useState, useTransition } from "react";
import { approveRequestAction, rejectRequestAction } from "@/features/approvals/actions";
import { Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalRequest {
  id: string;
  stageType: string;
  stageLabel: string;
  entityType: string;
  entityId: string;
  status: string;
  createdAt: string;
}

export function ApprovalQueue({ requests }: { requests: ApprovalRequest[] }) {
  const [items, setItems] = useState(requests);
  const [isPending, startTransition] = useTransition();

  function handleApprove(id: string) {
    startTransition(async () => {
      const res = await approveRequestAction(id);
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.id !== id));
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const res = await rejectRequestAction(id);
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.id !== id));
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-navy-border dark:bg-navy-surface">
        <Check className="mx-auto mb-3 h-8 w-8 text-green-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All caught up! No pending approvals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-navy-border dark:bg-navy-surface"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {req.stageLabel}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {req.entityType} · {new Date(req.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(req.id)}
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(req.id)}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
