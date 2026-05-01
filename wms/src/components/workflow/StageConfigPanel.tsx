"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  WorkflowStage,
  StagePort,
  StageField,
  StageRule,
  PortDataType,
  FieldType,
  RuleOperator,
  RuleAction,
} from "@/lib/workflow/types";
import {
  PORT_DATA_TYPES,
  FIELD_TYPES,
  RULE_OPERATORS,
  RULE_ACTIONS,
  PORT_COLORS,
} from "@/lib/workflow/types";
import { Trash2, Plus, X, ScanBarcode, Check, Printer, Loader2 } from "lucide-react";
import JsBarcode from "jsbarcode";
import { registerStageBarcodeAction } from "@/features/tracking/actions";

type Tab = "general" | "ports" | "form" | "behavior";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "ports", label: "Ports" },
  { key: "form", label: "Form" },
  { key: "behavior", label: "Behavior" },
];

const COLORS = [
  "emerald", "yellow", "cyan", "violet", "amber",
  "gray", "rose", "pink", "slate", "blue",
];

const ICONS = [
  "PackageOpen", "ClipboardCheck", "ArrowDownToLine", "ClipboardList",
  "Package", "Pause", "Send", "RotateCcw", "Puzzle",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  stage: WorkflowStage | null;
  allStages: WorkflowStage[];
  onChange: (updated: WorkflowStage) => void;
  onClose: () => void;
  warehouseId: string;
  projectId?: string;
}

export function StageConfigPanel({ stage, allStages, onChange, onClose, warehouseId, projectId }: Props) {
  const [tab, setTab] = useState<Tab>("general");

  if (!stage) {
    return (
      <div className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Select a stage on the canvas to configure it
        </div>
      </div>
    );
  }

  const update = (partial: Partial<WorkflowStage>) => {
    onChange({ ...stage, ...partial });
  };

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
        <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
          {stage.label}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              tab === t.key
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "general" && <GeneralTab stage={stage} update={update} />}
        {tab === "ports" && <PortsTab stage={stage} update={update} />}
        {tab === "form" && <FormTab stage={stage} update={update} />}
        {tab === "behavior" && <BehaviorTab stage={stage} allStages={allStages} update={update} warehouseId={warehouseId} projectId={projectId} />}
      </div>
    </div>
  );
}

// ─── General Tab ────────────────────────────────────────────────────────────

function GeneralTab({ stage, update }: { stage: WorkflowStage; update: (p: Partial<WorkflowStage>) => void }) {
  return (
    <>
      <Field label="Label">
        <input
          type="text"
          value={stage.label}
          onChange={(e) => update({ label: e.target.value })}
          className="input-base"
        />
      </Field>
      <Field label="Icon">
        <div className="flex flex-wrap gap-1.5">
          {ICONS.map((icon) => (
            <button
              key={icon}
              onClick={() => update({ icon })}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-mono transition-colors",
                stage.icon === icon
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10",
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => update({ color })}
              className={cn(
                "h-7 w-7 rounded-md border-2 transition-all",
                stage.color === color
                  ? "border-blue-600 ring-2 ring-blue-300 dark:border-blue-400"
                  : "border-transparent hover:border-gray-300 dark:hover:border-gray-600",
              )}
              style={{ backgroundColor: colorToHex(color) }}
              title={color}
            />
          ))}
        </div>
      </Field>
      <Field label="Entity Binding">
        <input
          type="text"
          value={stage.entityBinding ?? ""}
          onChange={(e) => update({ entityBinding: e.target.value || undefined })}
          placeholder="e.g. Receipt, PickList"
          className="input-base"
        />
      </Field>
    </>
  );
}

function colorToHex(color: string): string {
  const map: Record<string, string> = {
    emerald: "#10b981", yellow: "#eab308", cyan: "#06b6d4",
    violet: "#8b5cf6", amber: "#f59e0b", gray: "#6b7280",
    rose: "#f43f5e", pink: "#ec4899", slate: "#64748b", blue: "#3b82f6",
  };
  return map[color] ?? "#6b7280";
}

// ─── Ports Tab ──────────────────────────────────────────────────────────────

function PortsTab({ stage, update }: { stage: WorkflowStage; update: (p: Partial<WorkflowStage>) => void }) {
  const addPort = (direction: "inputs" | "outputs") => {
    const newPort: StagePort = { id: uid(), label: "New Port", dataType: "record", required: false };
    update({ [direction]: [...stage[direction], newPort] });
  };

  const updatePort = (direction: "inputs" | "outputs", portId: string, partial: Partial<StagePort>) => {
    update({
      [direction]: stage[direction].map((p) =>
        p.id === portId ? { ...p, ...partial } : p,
      ),
    });
  };

  const removePort = (direction: "inputs" | "outputs", portId: string) => {
    update({ [direction]: stage[direction].filter((p) => p.id !== portId) });
  };

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Inputs</span>
          <Button size="sm" variant="ghost" onClick={() => addPort("inputs")}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {stage.inputs.map((port) => (
          <PortRow key={port.id} port={port} onChange={(p) => updatePort("inputs", port.id, p)} onRemove={() => removePort("inputs", port.id)} />
        ))}
        {stage.inputs.length === 0 && <EmptyHint text="No input ports" />}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Outputs</span>
          <Button size="sm" variant="ghost" onClick={() => addPort("outputs")}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {stage.outputs.map((port) => (
          <PortRow key={port.id} port={port} onChange={(p) => updatePort("outputs", port.id, p)} onRemove={() => removePort("outputs", port.id)} />
        ))}
        {stage.outputs.length === 0 && <EmptyHint text="No output ports" />}
      </div>
    </>
  );
}

function PortRow({ port, onChange, onRemove }: { port: StagePort; onChange: (p: Partial<StagePort>) => void; onRemove: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", PORT_COLORS[port.dataType])} />
      <input
        type="text"
        value={port.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="min-w-0 flex-1 bg-transparent text-xs text-gray-800 outline-none dark:text-gray-200"
      />
      <select
        value={port.dataType}
        onChange={(e) => onChange({ dataType: e.target.value as PortDataType })}
        className="rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
      >
        {PORT_DATA_TYPES.map((dt) => (
          <option key={dt} value={dt}>{dt}</option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-[10px] text-gray-500">
        <input type="checkbox" checked={port.required} onChange={(e) => onChange({ required: e.target.checked })} className="h-3 w-3" />
        Req
      </label>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Form Tab ───────────────────────────────────────────────────────────────

function FormTab({ stage, update }: { stage: WorkflowStage; update: (p: Partial<WorkflowStage>) => void }) {
  const addField = () => {
    const newField: StageField = { id: uid(), label: "New Field", fieldType: "text", required: false };
    update({ fields: [...stage.fields, newField] });
  };

  const updateField = (fieldId: string, partial: Partial<StageField>) => {
    update({ fields: stage.fields.map((f) => (f.id === fieldId ? { ...f, ...partial } : f)) });
  };

  const removeField = (fieldId: string) => {
    update({ fields: stage.fields.filter((f) => f.id !== fieldId) });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newFields = [...stage.fields];
    const target = index + direction;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    update({ fields: newFields });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fields</span>
        <Button size="sm" variant="ghost" onClick={addField}>
          <Plus className="h-3 w-3" /> Add Field
        </Button>
      </div>
      {stage.fields.map((field, i) => (
        <div key={field.id} className="mb-2 rounded-md border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[10px]">▲</button>
              <button onClick={() => moveField(i, 1)} disabled={i === stage.fields.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-[10px]">▼</button>
            </div>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-xs font-medium text-gray-800 outline-none dark:text-gray-200"
            />
            <button onClick={() => removeField(field.id)} className="text-gray-400 hover:text-red-500">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={field.fieldType}
              onChange={(e) => updateField(field.id, { fieldType: e.target.value as FieldType })}
              className="rounded bg-white px-1.5 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft} value={ft}>{ft.replace("_", " ")}</option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-[10px] text-gray-500">
              <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="h-3 w-3" />
              Required
            </label>
          </div>
          {field.fieldType === "select" && (
            <div>
              <label className="text-[10px] text-gray-500">Options (comma-separated)</label>
              <input
                type="text"
                value={(field.options ?? []).join(", ")}
                onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                className="input-base mt-0.5"
                placeholder="Option1, Option2, Option3"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500">Placeholder</label>
            <input
              type="text"
              value={field.placeholder ?? ""}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value || undefined })}
              className="input-base mt-0.5"
            />
          </div>
          {stage.outputs.length > 0 && (
            <div>
              <label className="text-[10px] text-gray-500">Map to output port</label>
              <select
                value={field.mappedToPort ?? ""}
                onChange={(e) => updateField(field.id, { mappedToPort: e.target.value || undefined })}
                className="mt-0.5 w-full rounded bg-white px-1.5 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="">None</option>
                {stage.outputs.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} ({p.dataType})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
      {stage.fields.length === 0 && <EmptyHint text="No form fields — add one to capture data at this stage" />}
    </div>
  );
}

// ─── Behavior Tab ───────────────────────────────────────────────────────────

function BehaviorTab({ stage, allStages, update, warehouseId, projectId }: { stage: WorkflowStage; allStages: WorkflowStage[]; update: (p: Partial<WorkflowStage>) => void; warehouseId: string; projectId?: string }) {
  const updateBehavior = (partial: Partial<WorkflowStage["behavior"]>) => {
    update({ behavior: { ...stage.behavior, ...partial } });
  };

  const addRule = () => {
    const newRule: StageRule = {
      id: uid(),
      condition: { field: "", operator: "eq", value: "" },
      action: "flag",
      message: "",
    };
    update({ rules: [...stage.rules, newRule] });
  };

  const updateRule = (ruleId: string, partial: Partial<StageRule>) => {
    update({ rules: stage.rules.map((r) => (r.id === ruleId ? { ...r, ...partial } : r)) });
  };

  const removeRule = (ruleId: string) => {
    update({ rules: stage.rules.filter((r) => r.id !== ruleId) });
  };

  const otherStages = allStages.filter((s) => s.id !== stage.id);

  return (
    <>
      {/* Barcode section */}
      <BarcodeConfigSection stage={stage} updateBehavior={updateBehavior} warehouseId={warehouseId} projectId={projectId} />

      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Toggles</span>
        <Toggle label="Auto-advance" checked={stage.behavior.autoAdvance} onChange={(v) => updateBehavior({ autoAdvance: v })} hint="Automatically transition when all required fields are filled" />
        <Toggle label="Requires approval" checked={stage.behavior.requiresApproval} onChange={(v) => updateBehavior({ requiresApproval: v })} hint="A manager must sign off before proceeding" />
        <Toggle label="Creates task" checked={stage.behavior.createsTask} onChange={(v) => updateBehavior({ createsTask: v })} hint="Auto-create a Task record when this stage activates" />
        <Field label="Notify roles (comma-separated)">
          <input
            type="text"
            value={stage.behavior.notifyRoles.join(", ")}
            onChange={(e) => updateBehavior({ notifyRoles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="input-base"
            placeholder="warehouse_manager, supervisor"
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rules</span>
          <Button size="sm" variant="ghost" onClick={addRule}>
            <Plus className="h-3 w-3" /> Add Rule
          </Button>
        </div>
        {stage.rules.map((rule) => (
          <div key={rule.id} className="mb-2 rounded-md border border-gray-200 bg-gray-50 p-2.5 dark:border-white/10 dark:bg-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-500">IF</span>
              <button onClick={() => removeRule(rule.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <select
                value={rule.condition.field}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, field: e.target.value } })}
                className="flex-1 rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="">Select field...</option>
                {stage.fields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
              <select
                value={rule.condition.operator}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, operator: e.target.value as RuleOperator } })}
                className="rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
              >
                {RULE_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op.replace("_", " ")}</option>
                ))}
              </select>
              <input
                type="text"
                value={rule.condition.value}
                onChange={(e) => updateRule(rule.id, { condition: { ...rule.condition, value: e.target.value } })}
                className="w-16 rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
                placeholder="value"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500">THEN</span>
              <select
                value={rule.action}
                onChange={(e) => updateRule(rule.id, { action: e.target.value as RuleAction })}
                className="rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
              >
                {RULE_ACTIONS.map((a) => (
                  <option key={a} value={a}>{a.replace("_", " ")}</option>
                ))}
              </select>
              {rule.action === "route_to" && (
                <select
                  value={rule.targetStageId ?? ""}
                  onChange={(e) => updateRule(rule.id, { targetStageId: e.target.value || undefined })}
                  className="flex-1 rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
                >
                  <option value="">Select stage...</option>
                  {otherStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              )}
              {(rule.action === "flag" || rule.action === "block") && (
                <input
                  type="text"
                  value={rule.message ?? ""}
                  onChange={(e) => updateRule(rule.id, { message: e.target.value })}
                  className="flex-1 rounded bg-white px-1 py-0.5 text-[10px] dark:bg-gray-800 dark:text-gray-300"
                  placeholder="Message..."
                />
              )}
            </div>
          </div>
        ))}
        {stage.rules.length === 0 && <EmptyHint text="No rules — add one to control routing or flag conditions" />}
      </div>
    </>
  );
}

// ─── Barcode Config Section ─────────────────────────────────────────────────

function buildSampleBarcode(prefix: string, label: string): string {
  const tag = (prefix || label.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4)) || "STG";
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${tag}-${yy}${mm}${dd}-00001`;
}

function InlineBarcodePreview({ code }: { code: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 11,
        margin: 4,
        textMargin: 2,
      });
    }
  }, [code]);

  return <svg ref={svgRef} className="w-full" />;
}

function BarcodeConfigSection({
  stage,
  updateBehavior,
  warehouseId,
  projectId,
}: {
  stage: WorkflowStage;
  updateBehavior: (partial: Partial<WorkflowStage["behavior"]>) => void;
  warehouseId: string;
  projectId?: string;
}) {
  const enabled = stage.behavior.generateBarcode ?? true;
  const prefix = stage.behavior.barcodePrefix ?? "";
  const [showPreview, setShowPreview] = useState(stage.behavior.barcodeConfirmed ?? false);
  const confirmed = stage.behavior.barcodeConfirmed ?? false;
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const sampleBarcode = buildSampleBarcode(prefix, stage.label);

  const handleGenerate = () => {
    setShowPreview(true);
    setRegisterResult(null);
    updateBehavior({ barcodeConfirmed: false });
  };

  const handleConfirm = async () => {
    const autoPrefix = prefix || stage.label.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4);
    setRegistering(true);
    setRegisterResult(null);
    try {
      const result = await registerStageBarcodeAction({
        warehouseId,
        projectId,
        stageId: stage.id,
        stageLabel: stage.label,
        stageType: stage.type,
        barcodePrefix: autoPrefix,
        barcode: sampleBarcode,
      });
      if (result.ok && result.data) {
        updateBehavior({ barcodePrefix: autoPrefix, generateBarcode: true, barcodeConfirmed: true });
        setRegisterResult(result.data.barcode);
      } else {
        setRegisterResult(null);
      }
    } finally {
      setRegistering(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const win = window.open("", "_blank", "width=420,height=300");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Barcode Preview</title>
<style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui,sans-serif;flex-direction:column;gap:8px}
.info{font-size:11px;color:#666}.stage{font-weight:600;font-size:13px;color:#111}
@media print{body{min-height:auto}}</style></head>
<body><div class="stage">${stage.label}</div>${printRef.current.innerHTML}
<div class="info">Stage: ${stage.label} · Type: ${stage.type}</div></body></html>`);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  }, [stage.label, stage.type]);

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
      <div className="flex items-center gap-2">
        <ScanBarcode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Barcode Tracking</span>
      </div>

      <Toggle
        label="Generate barcode at this stage"
        checked={enabled}
        onChange={(v) => {
          updateBehavior({ generateBarcode: v, barcodeConfirmed: false });
          if (!v) { setShowPreview(false); }
        }}
        hint="Create a unique 1D barcode when an item enters this process"
      />

      {enabled && (
        <>
          <Field label="Barcode prefix">
            <input
              type="text"
              value={prefix}
              onChange={(e) => {
                updateBehavior({ barcodePrefix: e.target.value.toUpperCase(), barcodeConfirmed: false });
              }}
              className="input-base font-mono"
              placeholder={`e.g. ${(stage.label ?? "STAGE").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4)}`}
            />
          </Field>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              className="flex-1"
            >
              <ScanBarcode className="h-3.5 w-3.5 mr-1" />
              Generate Preview
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={confirmed || registering}
              className="flex-1"
            >
              {registering ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              {registering ? "Registering…" : confirmed ? "Confirmed" : "Confirm & Register"}
            </Button>
          </div>

          {showPreview && (
            <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <div ref={printRef}>
                <InlineBarcodePreview code={sampleBarcode} />
              </div>
              <p className="mt-1.5 text-center text-[10px] text-gray-400">
                Sample: <span className="font-mono font-medium text-gray-600 dark:text-gray-300">{sampleBarcode}</span>
              </p>
              <div className="mt-2 flex justify-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-colors"
                >
                  <Printer className="h-3 w-3" />
                  Print Sample
                </button>
              </div>
              {confirmed && (
                <div className="mt-2 rounded-md bg-green-50 p-2 dark:bg-green-950/30">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    Registered in tracking system
                  </div>
                  {registerResult && (
                    <p className="mt-1 text-center text-[10px] text-green-700 dark:text-green-300">
                      Barcode <span className="font-mono font-semibold">{registerResult}</span> is now searchable in Tracking
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!showPreview && (
            <p className="text-[10px] text-gray-400">
              Format: <span className="font-mono">{sampleBarcode.replace("-00001", "-SEQ")}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <div className="pt-0.5">
        <button
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm",
              checked && "translate-x-4",
            )}
          />
        </button>
      </div>
      <div>
        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</div>
        {hint && <div className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</div>}
      </div>
    </label>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-white/10 dark:text-gray-500">
      {text}
    </div>
  );
}
