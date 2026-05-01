"use client";

import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
  type ReactFlowInstance,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NODE_TYPES } from "./StageNode";
import { StagePalette } from "./StagePalette";
import { StageConfigPanel } from "./StageConfigPanel";
import { createStageFromTemplate } from "@/lib/workflow/registry";
import { validateDAG } from "@/lib/workflow/engine";
import type { WorkflowStage, WorkflowEdge as WFEdge, BuiltInStageType, PortDataType } from "@/lib/workflow/types";
import { PORT_STROKE_COLORS } from "@/lib/workflow/types";
import type { Serialized } from "@/lib/utils";
import type { WorkflowTemplate } from "@prisma/client";
import { saveWorkflow, activateWorkflow, deactivateWorkflow } from "@/features/workflow/actions";
import { Save, Zap, ZapOff, LayoutGrid, AlertTriangle, Check } from "lucide-react";
import { MarkerType, ConnectionLineType } from "@xyflow/react";

// ─── Convert between our types and React Flow types ─────────────────────────

function stagesToNodes(stages: WorkflowStage[]): Node[] {
  return stages.map((s) => ({
    id: s.id,
    type: "stage",
    position: s.position,
    data: s as unknown as Record<string, unknown>,
  }));
}

function wfEdgesToRfEdges(edges: WFEdge[], stages: WorkflowStage[]): Edge[] {
  return edges.map((e) => {
    const srcStage = stages.find((s) => s.id === e.source);
    const srcPort = srcStage?.outputs.find((p) => p.id === e.sourcePort);
    const dataType = srcPort?.dataType as PortDataType | undefined;
    const strokeColor = dataType ? PORT_STROKE_COLORS[dataType] ?? "#9ca3af" : "#9ca3af";

    return {
      id: e.id,
      source: e.source,
      sourceHandle: e.sourcePort,
      target: e.target,
      targetHandle: e.targetPort,
      type: "smoothstep",
      animated: true,
      label: dataType && dataType !== "signal" ? dataType : undefined,
      labelStyle: { fontSize: 10, fontWeight: 500, fill: strokeColor },
      labelBgStyle: { fill: "white", fillOpacity: 0.85 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      style: { strokeWidth: 2.5, stroke: strokeColor },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: strokeColor },
    };
  });
}

function nodesToStages(nodes: Node[]): WorkflowStage[] {
  return nodes.map((n) => ({
    ...(n.data as unknown as WorkflowStage),
    position: n.position,
  }));
}

function rfEdgesToWfEdges(edges: Edge[]): WFEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourcePort: e.sourceHandle ?? "",
    target: e.target,
    targetPort: e.targetHandle ?? "",
  }));
}

// ─── Auto-layout with dagre ─────────────────────────────────────────────────

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 160 });

  for (const node of nodes) {
    const stage = node.data as unknown as WorkflowStage;
    const portRows = Math.max(stage.inputs.length, stage.outputs.length, 1);
    const height = 56 + portRows * 28 + 8;
    g.setNode(node.id, { width: 220, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 110, y: pos.y - pos.height / 2 },
    };
  });
}

// ─── Connection validation ──────────────────────────────────────────────────

function getPortDataType(nodes: Node[], nodeId: string, handleId: string): string | null {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const stage = node.data as unknown as WorkflowStage;
  const port = [...stage.inputs, ...stage.outputs].find((p) => p.id === handleId);
  return port?.dataType ?? null;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  warehouseId: string;
  projectId?: string;
  initial?: Serialized<WorkflowTemplate> | null;
}

export function WorkflowDesigner({ warehouseId, projectId, initial }: Props) {
  const initialStages = initial ? (initial.stages as unknown as WorkflowStage[]) : [];
  const initialEdges = initial ? (initial.edges as unknown as WFEdge[]) : [];

  const [nodes, setNodes, onNodesChange] = useNodesState(stagesToNodes(initialStages));
  const [edges, setEdges, onEdgesChange] = useEdgesState(wfEdgesToRfEdges(initialEdges, initialStages));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | undefined>(initial?.id);
  const [templateName, setTemplateName] = useState(initial?.name ?? "Untitled Workflow");
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);
  const [version, setVersion] = useState(initial?.version ?? 0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedStage = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    return node ? (node.data as unknown as WorkflowStage) : null;
  }, [selectedNodeId, nodes]);

  const allStages = useMemo(() => nodesToStages(nodes), [nodes]);

  // ─── Keep edge labels/colors in sync with current port data types ──────

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const srcType = e.sourceHandle
          ? getPortDataType(nodes, e.source, e.sourceHandle)
          : null;
        const strokeColor = srcType
          ? PORT_STROKE_COLORS[srcType as PortDataType] ?? "#9ca3af"
          : "#9ca3af";
        const label = srcType && srcType !== "signal" ? srcType : undefined;

        if (e.label === label && e.style?.stroke === strokeColor) return e;

        return {
          ...e,
          label,
          labelStyle: { fontSize: 10, fontWeight: 500, fill: strokeColor },
          labelBgStyle: { fill: "white", fillOpacity: 0.85 },
          style: { strokeWidth: 2.5, stroke: strokeColor },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: strokeColor },
        };
      }),
    );
  }, [nodes, setEdges]);

  // ─── Connection handling ────────────────────────────────────────────────

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return false;
      if (connection.source === connection.target) return false;
      return true;
    },
    [],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const id = `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`;
      const srcType = connection.sourceHandle
        ? getPortDataType(nodes, connection.source, connection.sourceHandle)
        : null;
      const strokeColor = srcType
        ? PORT_STROKE_COLORS[srcType as PortDataType] ?? "#9ca3af"
        : "#9ca3af";

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id,
            type: "smoothstep",
            animated: true,
            label: srcType && srcType !== "signal" ? srcType : undefined,
            labelStyle: { fontSize: 10, fontWeight: 500, fill: strokeColor },
            labelBgStyle: { fill: "white", fillOpacity: 0.85 },
            labelBgPadding: [6, 3] as [number, number],
            labelBgBorderRadius: 4,
            style: { strokeWidth: 2.5, stroke: strokeColor },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: strokeColor },
          },
          eds,
        ),
      );
    },
    [setEdges, nodes],
  );

  // ─── Node selection ─────────────────────────────────────────────────────

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // ─── Drag-and-drop from palette ─────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const stageType = event.dataTransfer.getData("application/workflow-stage-type") as BuiltInStageType;
      if (!stageType) return;

      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds || !rfInstance.current) return;

      const position = rfInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const stage = createStageFromTemplate(stageType, position);
      const newNode: Node = {
        id: stage.id,
        type: "stage",
        position: stage.position,
        data: stage as unknown as Record<string, unknown>,
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(stage.id);
    },
    [setNodes],
  );

  // ─── Stage config updates ──────────────────────────────────────────────

  const onStageChange = useCallback(
    (updated: WorkflowStage) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === updated.id ? { ...n, data: updated as unknown as Record<string, unknown> } : n,
        ),
      );
    },
    [setNodes],
  );

  // ─── Auto-layout ──────────────────────────────────────────────────────

  const onAutoLayout = useCallback(() => {
    setNodes((nds) => autoLayout(nds, edges));
  }, [edges, setNodes]);

  // ─── Save ─────────────────────────────────────────────────────────────

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const onSave = useCallback(async () => {
    const stages = nodesToStages(nodes);
    const wfEdges = rfEdgesToWfEdges(edges);

    const validation = validateDAG(stages, wfEdges);
    if (!validation.valid) {
      showToast("error", validation.error ?? "Invalid workflow");
      return;
    }

    setSaving(true);
    try {
      const result = await saveWorkflow({
        id: templateId,
        warehouseId,
        projectId,
        name: templateName,
        stages,
        edges: wfEdges,
      });
      if (result.ok && result.data) {
        setTemplateId(result.data.id);
        setVersion(result.data.version);
        setIsActive(result.data.isActive);
        showToast("success", "Workflow saved");
      } else if (!result.ok) {
        showToast("error", result.error);
      }
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, templateId, warehouseId, projectId, templateName]);

  // ─── Activate / Deactivate ────────────────────────────────────────────

  const onToggleActive = useCallback(async () => {
    if (!templateId) {
      showToast("error", "Save the workflow first");
      return;
    }

    setSaving(true);
    try {
      if (isActive) {
        const result = await deactivateWorkflow(templateId);
        if (result.ok) {
          setIsActive(false);
          showToast("success", "Workflow deactivated");
        } else {
          showToast("error", result.error);
        }
      } else {
        const result = await activateWorkflow(templateId);
        if (result.ok) {
          setIsActive(true);
          showToast("success", "Workflow activated");
        } else if (!result.ok) {
          showToast("error", result.error);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [templateId, isActive]);

  return (
    <div className="flex h-full">
      <StagePalette />

      <div className="relative flex-1" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onInit={(instance) => { rfInstance.current = instance; }}
          isValidConnection={isValidConnection}
          nodeTypes={NODE_TYPES}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ strokeWidth: 2.5, strokeDasharray: "8 4", stroke: "#3b82f6" }}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-gray-50 dark:!bg-gray-900" />
          <Controls className="!bg-white !shadow-md dark:!bg-gray-800 !rounded-lg !border !border-gray-200 dark:!border-white/10" />
          <MiniMap
            className="!bg-white !shadow-md dark:!bg-gray-800 !rounded-lg !border !border-gray-200 dark:!border-white/10"
            nodeColor={(n) => {
              const stage = n.data as unknown as WorkflowStage;
              const colorMap: Record<string, string> = {
                emerald: "#10b981", yellow: "#eab308", cyan: "#06b6d4",
                violet: "#8b5cf6", amber: "#f59e0b", gray: "#6b7280",
                rose: "#f43f5e", pink: "#ec4899", slate: "#64748b", blue: "#3b82f6",
              };
              return colorMap[stage.color ?? "slate"] ?? "#64748b";
            }}
          />

          {/* Toolbar */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-gray-800">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-800 outline-none dark:text-gray-200 w-48"
                placeholder="Workflow name..."
              />
              <div className="h-5 w-px bg-gray-200 dark:bg-white/10" />
              <Button size="sm" variant="outline" onClick={onAutoLayout}>
                <LayoutGrid className="h-3.5 w-3.5" />
                Layout
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button
                size="sm"
                variant={isActive ? "secondary" : "default"}
                onClick={onToggleActive}
                disabled={saving || !templateId}
              >
                {isActive ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                {isActive ? "Deactivate" : "Activate"}
              </Button>
              {version > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">v{version}</span>
              )}
            </div>
          </Panel>

          {/* Toast */}
          {toast && (
            <Panel position="bottom-center">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg",
                  toast.type === "success"
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white",
                )}
              >
                {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {toast.message}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      <StageConfigPanel
        stage={selectedStage}
        allStages={allStages}
        onChange={onStageChange}
        onClose={() => setSelectedNodeId(null)}
        warehouseId={warehouseId}
        projectId={projectId}
      />
    </div>
  );
}
