"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { QRScanInput } from "@/components/tracking/qr-scan-input";
import type { StageField, StageBehavior } from "@/lib/workflow/types";

interface StageFormProps {
  fields: StageField[];
  behavior: StageBehavior;
  stageLabel: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  disabled?: boolean;
}

export function StageForm({
  fields,
  behavior,
  stageLabel,
  onSubmit,
  disabled,
}: StageFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.id] = f.defaultValue ?? "";
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();

  function updateField(fieldId: string, value: string) {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = formData[f.id] ?? "";
      if (f.fieldType === "number") {
        data[f.label] = raw ? Number(raw) : null;
      } else if (f.fieldType === "checkbox") {
        data[f.label] = raw === "true";
      } else {
        data[f.label] = raw;
      }
    }
    startTransition(() => onSubmit(data));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          {renderField(field, formData[field.id] ?? "", (v) => updateField(field.id, v))}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={disabled || isPending}>
          {isPending ? "Processing…" : `Complete ${stageLabel}`}
        </Button>
        {behavior.requiresApproval && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Requires approval before advancing
          </span>
        )}
        {behavior.autoAdvance && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Auto-advances to next stage
          </span>
        )}
      </div>
    </form>
  );
}

function renderField(
  field: StageField,
  value: string,
  onChange: (v: string) => void,
) {
  const baseClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 " +
    "outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 " +
    "dark:border-navy-border dark:bg-navy dark:text-gray-200";

  switch (field.fieldType) {
    case "text":
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseClass}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseClass}
        />
      );

    case "select":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={baseClass}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "checkbox":
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {field.placeholder ?? "Yes"}
          </span>
        </label>
      );

    case "textarea":
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
          className={baseClass}
        />
      );

    case "barcode_scan":
      return (
        <QRScanInput
          onScan={(code) => onChange(code)}
          placeholder={field.placeholder ?? "Scan barcode…"}
        />
      );

    case "location_picker":
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? "Enter location code…"}
          required={field.required}
          className={baseClass}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      );
  }
}
