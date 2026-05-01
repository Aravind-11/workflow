import type { WorkflowStage, BuiltInStageType } from "./types";
import { defaultBehavior } from "./types";

type StageTemplate = Omit<WorkflowStage, "id" | "position">;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function port(label: string, dataType: WorkflowStage["inputs"][number]["dataType"], required = false) {
  return { id: uid(), label, dataType, required };
}

const TEMPLATES: Record<BuiltInStageType, StageTemplate> = {
  receive: {
    type: "receive",
    label: "Receive",
    icon: "PackageOpen",
    color: "emerald",
    inputs: [port("Trigger", "signal")],
    outputs: [port("Receipt", "receipt", true), port("Inventory", "inventory")],
    fields: [
      { id: uid(), label: "PO Reference", fieldType: "text", required: false, placeholder: "PO-XXXX" },
      { id: uid(), label: "Quantity", fieldType: "number", required: true },
      { id: uid(), label: "Condition", fieldType: "select", required: true, options: ["Good", "Damaged", "Hold"] },
    ],
    behavior: defaultBehavior(),
    rules: [],
    entityBinding: "Receipt",
  },
  qc: {
    type: "qc",
    label: "QC / Inspect",
    icon: "ClipboardCheck",
    color: "yellow",
    inputs: [port("Receipt In", "receipt", true)],
    outputs: [port("Passed", "receipt", true), port("Failed", "signal")],
    fields: [
      { id: uid(), label: "Inspection Notes", fieldType: "textarea", required: false },
      { id: uid(), label: "Pass / Fail", fieldType: "select", required: true, options: ["Pass", "Fail"] },
    ],
    behavior: defaultBehavior(),
    rules: [],
    entityBinding: "ReceiptLine",
  },
  putaway: {
    type: "putaway",
    label: "Putaway",
    icon: "ArrowDownToLine",
    color: "cyan",
    inputs: [port("Inventory In", "inventory", true)],
    outputs: [port("Location", "location", true), port("Done", "signal")],
    fields: [
      { id: uid(), label: "Target Location", fieldType: "location_picker", required: true },
    ],
    behavior: defaultBehavior(),
    rules: [],
    entityBinding: "InventoryBalance",
  },
  pick: {
    type: "pick",
    label: "Pick",
    icon: "ClipboardList",
    color: "violet",
    inputs: [port("Shipment In", "shipment", true)],
    outputs: [port("Pick List", "picklist", true)],
    fields: [
      { id: uid(), label: "Pick Qty", fieldType: "number", required: true },
    ],
    behavior: { ...defaultBehavior(), createsTask: true },
    rules: [],
    entityBinding: "PickList",
  },
  pack: {
    type: "pack",
    label: "Pack",
    icon: "Package",
    color: "amber",
    inputs: [port("Pick List In", "picklist", true)],
    outputs: [port("Pack List", "packlist", true)],
    fields: [
      { id: uid(), label: "Box Dimensions", fieldType: "text", required: false, placeholder: "L x W x H" },
      { id: uid(), label: "Weight (kg)", fieldType: "number", required: false },
    ],
    behavior: { ...defaultBehavior(), createsTask: true },
    rules: [],
    entityBinding: "PackList",
  },
  hold: {
    type: "hold",
    label: "Hold / Stage",
    icon: "Pause",
    color: "gray",
    inputs: [port("In", "record", true)],
    outputs: [port("Out", "record", true)],
    fields: [],
    behavior: { ...defaultBehavior(), requiresApproval: true },
    rules: [],
  },
  ship: {
    type: "ship",
    label: "Ship",
    icon: "Send",
    color: "rose",
    inputs: [port("Pack List In", "packlist", true)],
    outputs: [port("Shipment", "shipment", true), port("Document", "document")],
    fields: [
      { id: uid(), label: "Carrier", fieldType: "text", required: true },
      { id: uid(), label: "Tracking Number", fieldType: "text", required: false },
    ],
    behavior: defaultBehavior(),
    rules: [],
    entityBinding: "Shipment",
  },
  return: {
    type: "return",
    label: "Return",
    icon: "RotateCcw",
    color: "pink",
    inputs: [port("Shipment In", "shipment", true)],
    outputs: [port("Receipt", "receipt"), port("Inventory", "inventory")],
    fields: [
      { id: uid(), label: "Reason", fieldType: "textarea", required: true },
      { id: uid(), label: "Condition", fieldType: "select", required: true, options: ["Good", "Damaged", "Defective"] },
    ],
    behavior: defaultBehavior(),
    rules: [],
    entityBinding: "ReturnRMA",
  },
  custom: {
    type: "custom",
    label: "Custom Stage",
    icon: "Puzzle",
    color: "slate",
    inputs: [],
    outputs: [],
    fields: [],
    behavior: defaultBehavior(),
    rules: [],
  },
};

export function getStageTemplate(type: BuiltInStageType): StageTemplate {
  return structuredClone(TEMPLATES[type]);
}

export function getAllStageTemplates(): Array<{ type: BuiltInStageType; template: StageTemplate }> {
  return (Object.entries(TEMPLATES) as [BuiltInStageType, StageTemplate][]).map(
    ([type, template]) => ({ type, template: structuredClone(template) }),
  );
}

export function createStageFromTemplate(
  type: BuiltInStageType,
  position: { x: number; y: number },
): WorkflowStage {
  const template = getStageTemplate(type);
  return {
    id: uid(),
    ...template,
    position,
    inputs: template.inputs.map((p) => ({ ...p, id: uid() })),
    outputs: template.outputs.map((p) => ({ ...p, id: uid() })),
    fields: template.fields.map((f) => ({ ...f, id: uid() })),
  };
}
