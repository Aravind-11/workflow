import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import {
  lookupTrackingItem,
  getItemJourneyWithDwellTimes,
  searchTrackingItems,
} from "@/features/tracking/service";
import { getContainerContents } from "@/features/tracking/container-actions";
import {
  createStageFromTemplate,
  getAllStageTemplates,
} from "@/lib/workflow/registry";
import type { BuiltInStageType, WorkflowStage, WorkflowEdge } from "@/lib/workflow/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createTools(warehouseId?: string) {
  return {
    trackItem: tool({
      description:
        "Look up a tracking item by barcode or ID. Returns full details including project, warehouse, status, and all tracking events.",
      inputSchema: z.object({
        barcode: z.string().describe("The barcode or item ID to look up"),
      }),
      execute: async ({ barcode }: { barcode: string }) => {
        const item = await lookupTrackingItem(barcode) as Record<string, unknown> | null;
        if (!item) return { found: false, message: `No tracking item found for "${barcode}"` };
        const events = (item.events as Array<Record<string, unknown>>) ?? [];
        return {
          found: true,
          barcode: item.barcode,
          skuCode: item.skuCode,
          description: item.description,
          status: item.status ?? "ACTIVE",
          containerType: item.containerType ?? null,
          project: item.project ?? null,
          warehouse: item.warehouse ?? null,
          eventCount: events.length,
          events: events.slice(0, 20).map((e: Record<string, unknown>) => ({
            stage: e.stageLabel,
            type: e.stageType,
            barcode: e.barcode,
            handledBy: e.handledBy,
            location: e.locationCode,
            zone: e.warehouseZone,
            notes: e.notes,
            timestamp: e.timestamp,
          })),
        };
      },
    }),

    getItemJourney: tool({
      description:
        "Get the full journey timeline of a tracking item with dwell times between each stage.",
      inputSchema: z.object({
        barcode: z.string().describe("The barcode of the item"),
      }),
      execute: async ({ barcode }: { barcode: string }) => {
        const journey = await getItemJourneyWithDwellTimes(barcode);
        if (!journey) return { found: false, message: `No item found for "${barcode}"` };
        return {
          found: true,
          stages: journey.map((j) => ({
            stage: j.event.stageLabel,
            type: j.event.stageType,
            timestamp: j.event.timestamp,
            handledBy: j.event.handledBy,
            location: j.event.locationCode,
            notes: j.event.notes,
            dwellMinutes: j.dwellMs ? Math.round(j.dwellMs / 60000) : null,
          })),
        };
      },
    }),

    searchItems: tool({
      description:
        "Search tracking items by query text, project, container type, or date range.",
      inputSchema: z.object({
        query: z.string().optional().describe("Text to search in barcode, SKU, description, or customer name"),
        projectId: z.string().optional().describe("Filter by project ID"),
        containerType: z.enum(["BOX", "PALLET", "CARTON"]).optional(),
        dateFrom: z.string().optional().describe("ISO date string for start of range"),
        dateTo: z.string().optional().describe("ISO date string for end of range"),
      }),
      execute: async (params: { query?: string; projectId?: string; containerType?: string; dateFrom?: string; dateTo?: string }) => {
        if (!warehouseId) return { error: "No warehouse context available" };
        const items = await searchTrackingItems({
          warehouseId,
          query: params.query,
          projectId: params.projectId,
          containerType: params.containerType,
          dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
          dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
        });
        return {
          count: items.length,
          items: items.slice(0, 20).map((i) => ({
            barcode: i.barcode,
            skuCode: i.skuCode,
            description: i.description,
            project: i.project,
            warehouse: i.warehouse,
            eventCount: i._count.events,
          })),
        };
      },
    }),

    getContainerContents: tool({
      description:
        "List all items inside a container (box, pallet, or carton) by its barcode.",
      inputSchema: z.object({
        containerBarcode: z.string().describe("The container barcode"),
      }),
      execute: async ({ containerBarcode }: { containerBarcode: string }) => {
        const result = await getContainerContents(containerBarcode, warehouseId);
        if (!result.ok) return { found: false, message: result.error };
        return {
          found: true,
          container: result.data!.container,
          itemCount: result.data!.items.length,
          items: result.data!.items,
        };
      },
    }),

    listWorkflows: tool({
      description:
        "List all workflow templates for the current warehouse.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!warehouseId) return { error: "No warehouse context" };
        const templates = await prisma.workflowTemplate.findMany({
          where: { warehouseId },
          select: {
            id: true,
            name: true,
            version: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        });
        return { count: templates.length, workflows: templates };
      },
    }),

    generateWorkflow: tool({
      description:
        "Generate and save a workflow template from a description. Built-in stage types: receive, qc, putaway, pick, pack, hold, ship, return, custom.",
      inputSchema: z.object({
        name: z.string().describe("Name for the workflow"),
        stageDescriptions: z
          .array(
            z.object({
              type: z
                .enum(["receive", "qc", "putaway", "pick", "pack", "hold", "ship", "return", "custom"])
                .describe("Stage type from built-in templates"),
              label: z.string().optional().describe("Custom label for this stage"),
            }),
          )
          .describe("Ordered list of stages for the workflow"),
        projectId: z.string().optional().describe("Optional project ID to scope this workflow"),
      }),
      execute: async (params: { name: string; stageDescriptions: { type: string; label?: string }[]; projectId?: string }) => {
        if (!warehouseId) return { error: "No warehouse context available" };

        const stages: WorkflowStage[] = params.stageDescriptions.map((desc, i) => {
          const stage = createStageFromTemplate(desc.type as BuiltInStageType, {
            x: 50 + i * 300,
            y: 100,
          });
          if (desc.label) stage.label = desc.label;
          return stage;
        });

        const edges: WorkflowEdge[] = [];
        for (let i = 0; i < stages.length - 1; i++) {
          const src = stages[i];
          const tgt = stages[i + 1];
          const srcPort = src.outputs[0];
          const tgtPort = tgt.inputs[0];
          if (srcPort && tgtPort) {
            edges.push({
              id: uid(),
              source: src.id,
              sourcePort: srcPort.id,
              target: tgt.id,
              targetPort: tgtPort.id,
            });
          }
        }

        const created = await prisma.workflowTemplate.create({
          data: {
            warehouseId,
            projectId: params.projectId ?? null,
            name: params.name,
            stages: JSON.parse(JSON.stringify(stages)),
            edges: JSON.parse(JSON.stringify(edges)),
          },
        });

        return {
          success: true,
          workflowId: created.id,
          name: created.name,
          stageCount: stages.length,
          edgeCount: edges.length,
          stages: stages.map((s) => ({ id: s.id, type: s.type, label: s.label })),
          designerUrl: `/warehouses/${warehouseId}/workflow`,
        };
      },
    }),

    queryShipments: tool({
      description:
        "Look up shipments by status, tracking number, or shipment number.",
      inputSchema: z.object({
        status: z.enum(["DRAFT", "PICKING", "PACKING", "READY", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
        trackingNumber: z.string().optional(),
        shipmentNumber: z.string().optional(),
        limit: z.number().optional().default(10),
      }),
      execute: async (params: { status?: string; trackingNumber?: string; shipmentNumber?: string; limit?: number }) => {
        if (!warehouseId) return { error: "No warehouse context" };
        const where: Record<string, unknown> = { warehouseId };
        if (params.status) where.status = params.status;
        if (params.trackingNumber) where.trackingNumber = { contains: params.trackingNumber, mode: "insensitive" };
        if (params.shipmentNumber) where.shipmentNumber = { contains: params.shipmentNumber, mode: "insensitive" };

        const shipments = await prisma.shipment.findMany({
          where,
          select: {
            id: true,
            shipmentNumber: true,
            salesOrderRef: true,
            carrier: true,
            trackingNumber: true,
            status: true,
            plannedShipAt: true,
            shippedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: params.limit ?? 10,
        });
        return { count: shipments.length, shipments };
      },
    }),

    queryInventory: tool({
      description:
        "Look up inventory balances by SKU code, location, or status.",
      inputSchema: z.object({
        skuCode: z.string().optional().describe("SKU code to search for"),
        locationCode: z.string().optional().describe("Location code to filter by"),
        status: z.enum(["AVAILABLE", "RESERVED", "DAMAGED", "QUARANTINE"]).optional(),
        limit: z.number().optional().default(10),
      }),
      execute: async (params: { skuCode?: string; locationCode?: string; status?: string; limit?: number }) => {
        if (!warehouseId) return { error: "No warehouse context" };
        const where: Record<string, unknown> = { warehouseId };
        if (params.status) where.status = params.status;

        if (params.skuCode) {
          const item = await prisma.inventoryItem.findFirst({
            where: { skuCode: { contains: params.skuCode, mode: "insensitive" } },
            select: { id: true },
          });
          if (item) where.inventoryItemId = item.id;
        }

        if (params.locationCode) {
          const loc = await prisma.warehouseLocationHierarchy.findFirst({
            where: { warehouseId, locationCode: { contains: params.locationCode, mode: "insensitive" } },
            select: { id: true },
          });
          if (loc) where.locationId = loc.id;
        }

        const balances = await prisma.inventoryBalance.findMany({
          where,
          include: {
            inventoryItem: { select: { skuCode: true, name: true, uom: true } },
            location: { select: { locationCode: true, zone: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: params.limit ?? 10,
        });

        return {
          count: balances.length,
          balances: balances.map((b) => ({
            sku: b.inventoryItem.skuCode,
            name: b.inventoryItem.name,
            location: b.location?.locationCode ?? "Unassigned",
            zone: b.location?.zone,
            onHand: b.onHandQty,
            reserved: b.reservedQty,
            available: b.onHandQty - b.reservedQty,
            status: b.status,
            uom: b.inventoryItem.uom,
          })),
        };
      },
    }),

    listStageTemplates: tool({
      description:
        "List all available built-in workflow stage templates.",
      inputSchema: z.object({}),
      execute: async () => {
        const templates = getAllStageTemplates();
        return {
          templates: templates.map((t) => ({
            type: t.type,
            label: t.template.label,
            icon: t.template.icon,
            inputCount: t.template.inputs.length,
            outputCount: t.template.outputs.length,
            fieldCount: t.template.fields.length,
          })),
        };
      },
    }),
  };
}
