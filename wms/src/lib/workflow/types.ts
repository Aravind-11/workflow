// ─── Port data types ────────────────────────────────────────────────────────
export const PORT_DATA_TYPES = [
  "receipt",
  "inventory",
  "picklist",
  "packlist",
  "shipment",
  "location",
  "worker",
  "document",
  "record",
  "signal",
] as const;

export type PortDataType = (typeof PORT_DATA_TYPES)[number];

export const PORT_COLORS: Record<PortDataType, string> = {
  receipt: "bg-emerald-500",
  inventory: "bg-blue-500",
  picklist: "bg-violet-500",
  packlist: "bg-amber-500",
  shipment: "bg-rose-500",
  location: "bg-cyan-500",
  worker: "bg-orange-500",
  document: "bg-slate-500",
  record: "bg-gray-400",
  signal: "bg-yellow-400",
};

export const PORT_STROKE_COLORS: Record<PortDataType, string> = {
  receipt: "#10b981",
  inventory: "#3b82f6",
  picklist: "#8b5cf6",
  packlist: "#f59e0b",
  shipment: "#f43f5e",
  location: "#06b6d4",
  worker: "#f97316",
  document: "#64748b",
  record: "#9ca3af",
  signal: "#facc15",
};

// ─── Stage ports ────────────────────────────────────────────────────────────
export interface StagePort {
  id: string;
  label: string;
  dataType: PortDataType;
  required: boolean;
}

// ─── Form fields ────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "checkbox",
  "textarea",
  "barcode_scan",
  "location_picker",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface StageField {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
  mappedToPort?: string;
}

// ─── Behavior & rules ───────────────────────────────────────────────────────
export interface StageBehavior {
  autoAdvance: boolean;
  requiresApproval: boolean;
  createsTask: boolean;
  generateBarcode: boolean;
  barcodePrefix: string;
  barcodeConfirmed: boolean;
  notifyRoles: string[];
}

export const RULE_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "lt",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;

export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_ACTIONS = ["route_to", "skip", "flag", "block"] as const;
export type RuleAction = (typeof RULE_ACTIONS)[number];

export interface StageRule {
  id: string;
  condition: {
    field: string;
    operator: RuleOperator;
    value: string;
  };
  action: RuleAction;
  targetStageId?: string;
  message?: string;
}

// ─── Stage ──────────────────────────────────────────────────────────────────
export const BUILT_IN_STAGE_TYPES = [
  "receive",
  "qc",
  "putaway",
  "pick",
  "pack",
  "hold",
  "ship",
  "return",
  "custom",
] as const;

export type BuiltInStageType = (typeof BUILT_IN_STAGE_TYPES)[number];

export interface WorkflowStage {
  id: string;
  type: string;
  label: string;
  icon?: string;
  color?: string;
  position: { x: number; y: number };
  inputs: StagePort[];
  outputs: StagePort[];
  fields: StageField[];
  behavior: StageBehavior;
  rules: StageRule[];
  entityBinding?: string;
}

// ─── Edge ───────────────────────────────────────────────────────────────────
export interface WorkflowEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
}

// ─── Template (matches Prisma model shape) ──────────────────────────────────
export interface WorkflowTemplateData {
  id: string;
  warehouseId: string;
  name: string;
  version: number;
  isActive: boolean;
  stages: WorkflowStage[];
  edges: WorkflowEdge[];
}

// ─── Default behavior factory ───────────────────────────────────────────────
export function defaultBehavior(): StageBehavior {
  return {
    autoAdvance: false,
    requiresApproval: false,
    createsTask: false,
    generateBarcode: true,
    barcodePrefix: "",
    barcodeConfirmed: false,
    notifyRoles: [],
  };
}
