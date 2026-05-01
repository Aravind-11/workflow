import { prisma } from "@/server/db/prisma";

const NOISE_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "must",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "this", "that", "these", "those", "what", "which", "who", "whom",
  "and", "or", "but", "if", "then", "so", "as", "at", "by", "for",
  "in", "of", "on", "to", "up", "with", "from", "into", "about",
  "please", "help", "thanks", "thank", "hi", "hello", "hey",
]);

function extractSearchTerms(text: string): string[] {
  return text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NOISE_WORDS.has(w.toLowerCase()));
}

async function safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error("[context-retriever] query error:", err instanceof Error ? err.message : err);
    return null;
  }
}

function formatItem(item: Record<string, unknown>): string {
  const project = item.project as Record<string, unknown> | null;
  const warehouse = item.warehouse as Record<string, unknown> | null;
  const events = (item.events as Array<Record<string, unknown>>) ?? [];
  return (
    `### Tracking Item: ${item.barcode}\n` +
    `- SKU: ${item.skuCode}\n` +
    `- Description: ${item.description ?? "N/A"}\n` +
    `- Status: ${item.status ?? "ACTIVE"}\n` +
    `- Container type: ${item.containerType ?? "none"}\n` +
    `- Customer: ${item.customerName ?? "N/A"}\n` +
    `- Project: ${project?.name ?? "N/A"} (${project?.code ?? ""})\n` +
    `- Warehouse: ${warehouse?.name ?? "N/A"}\n` +
    `- Total events: ${events.length}\n` +
    (events.length > 0
      ? `- Event history:\n${events.map((e) =>
          `  - [${e.timestamp}] ${e.stageLabel} (${e.stageType})${e.locationCode ? ` at ${e.locationCode}` : ""}${e.notes ? ` — ${e.notes}` : ""}`
        ).join("\n")}`
      : "")
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveWarehouseFromQuery(
  userMessage: string,
  fallbackId?: string,
): Promise<{ id: string | undefined; code?: string; name?: string; resolvedFromQuery: boolean }> {
  const all = await safeQuery(() =>
    prisma.warehouse.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true, city: true, state: true, country: true },
    }),
  );
  if (!all || all.length === 0) {
    return { id: fallbackId, resolvedFromQuery: false };
  }

  const msg = ` ${userMessage.toLowerCase()} `;

  // Score every warehouse and pick the best non-zero match.
  let best: { w: (typeof all)[number]; score: number } | null = null;

  for (const w of all) {
    const code = w.code?.toLowerCase() ?? "";
    const codePrefix = code.split(/[-_/ ]/)[0] ?? "";
    const name = w.name?.toLowerCase() ?? "";
    const city = w.city?.toLowerCase() ?? "";

    const candidates: Array<{ token: string; weight: number }> = [];
    if (code.length >= 2) candidates.push({ token: code, weight: 100 });
    if (codePrefix && codePrefix !== code && codePrefix.length >= 2) {
      candidates.push({ token: codePrefix, weight: 90 });
    }
    if (name.length >= 3) candidates.push({ token: name, weight: 60 });
    if (city.length >= 3) candidates.push({ token: city, weight: 50 });

    for (const { token, weight } of candidates) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`);
      if (re.test(msg)) {
        const score = weight + token.length;
        if (!best || score > best.score) best = { w, score };
        break;
      }
    }
  }

  if (best) {
    return { id: best.w.id, code: best.w.code, name: best.w.name, resolvedFromQuery: true };
  }

  if (fallbackId) {
    const wh = all.find((w) => w.id === fallbackId);
    return { id: fallbackId, code: wh?.code, name: wh?.name, resolvedFromQuery: false };
  }
  return { id: undefined, resolvedFromQuery: false };
}

export async function retrieveContext(
  userMessage: string,
  defaultWarehouseId?: string,
): Promise<string> {
  const sections: string[] = [];
  const msg = userMessage.toLowerCase();
  const searchTerms = extractSearchTerms(userMessage);
  const searchQuery = searchTerms.join(" ");

  const resolved = await resolveWarehouseFromQuery(userMessage, defaultWarehouseId);
  const warehouseId = resolved.id;

  if (resolved.resolvedFromQuery && resolved.code) {
    sections.push(
      `### Target Warehouse\nQuery refers to **${resolved.name ?? resolved.code}** (${resolved.code}). All data below is for that warehouse.`,
    );
  }

  const isTrackingQuery = /track|find|where|look\s*up|locate|box|barcode|item|container|pallet|scan/i.test(msg);
  const isInventoryQuery = /inventory|stock|balance|sku|quantity|on.?hand/i.test(msg);
  const isShipmentQuery = /shipment|shipped|ship|order|delivery|deliver|carrier|tracking.?number/i.test(msg);
  const isWorkflowQuery = /workflow|stage|pipeline|process|design|create.*flow/i.test(msg);
  const isWorkerQuery = /worker|workers|staff|employee|employees|people|crew|headcount|roster|schedule|shift|on\s*duty|on\s*shift|who.+(working|on\s*shift)/i.test(msg);
  const isListQuery = /list|show|all|every|how many|count|overview|summary/i.test(msg);

  // --- 1. Always try to find tracking items when it looks like a tracking/find query ---
  if (isTrackingQuery && warehouseId && searchTerms.length > 0) {
    // Try exact barcode match first (for each search term)
    for (const term of searchTerms.slice(0, 5)) {
      const exact = await safeQuery(() =>
        prisma.trackingItem.findUnique({
          where: { barcode: term },
          include: {
            project: { select: { code: true, name: true, customerName: true } },
            warehouse: { select: { code: true, name: true } },
            events: {
              orderBy: { timestamp: "asc" },
              take: 15,
              select: {
                stageType: true, stageLabel: true, barcode: true,
                handledBy: true, locationCode: true, warehouseZone: true,
                notes: true, timestamp: true,
              },
            },
          },
        }),
      );
      if (exact) {
        sections.push(formatItem(exact as unknown as Record<string, unknown>));
      }
    }

    // If no exact match, do a fuzzy search across barcode, SKU, description, customer
    if (sections.length === 0) {
      const orConditions = searchTerms.flatMap((term) => [
        { barcode: { contains: term, mode: "insensitive" as const } },
        { skuCode: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { customerName: { contains: term, mode: "insensitive" as const } },
      ]);

      const found = await safeQuery(() =>
        prisma.trackingItem.findMany({
          where: { warehouseId, OR: orConditions },
          include: {
            project: { select: { code: true, name: true, customerName: true } },
            warehouse: { select: { code: true, name: true } },
            events: {
              orderBy: { timestamp: "asc" },
              take: 10,
              select: {
                stageType: true, stageLabel: true, barcode: true,
                handledBy: true, locationCode: true, warehouseZone: true,
                notes: true, timestamp: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      );

      if (found && found.length > 0) {
        sections.push(
          `### Search Results: ${found.length} item(s) matching "${searchQuery}"\n\n` +
          found.map((i) => formatItem(i as unknown as Record<string, unknown>)).join("\n\n"),
        );
      } else {
        sections.push(`### Search Results\nNo tracking items found matching "${searchQuery}" in this warehouse.`);
      }
    }
  }

  // --- 2. Inventory ---
  if (isInventoryQuery && warehouseId) {
    const balances = await safeQuery(() =>
      prisma.inventoryBalance.findMany({
        where: { warehouseId },
        include: {
          inventoryItem: { select: { skuCode: true, name: true, uom: true } },
          location: { select: { locationCode: true, zone: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
      }),
    );
    if (balances && balances.length > 0) {
      sections.push(
        `### Current Inventory (${balances.length} entries)\n` +
        balances.map((b) =>
          `- ${b.inventoryItem.skuCode} "${b.inventoryItem.name}" | Location: ${b.location?.locationCode ?? "Unassigned"} | On-hand: ${b.onHandQty} | Reserved: ${b.reservedQty} | Available: ${b.onHandQty - b.reservedQty} ${b.inventoryItem.uom} | Status: ${b.status}`
        ).join("\n"),
      );
    } else {
      sections.push("### Inventory\nNo inventory balances found for this warehouse.");
    }
  }

  // --- 3. Shipments ---
  if (isShipmentQuery && warehouseId) {
    const shipments = await safeQuery(() =>
      prisma.shipment.findMany({
        where: { warehouseId },
        select: {
          shipmentNumber: true, salesOrderRef: true, carrier: true,
          trackingNumber: true, status: true, plannedShipAt: true, shippedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    );
    if (shipments && shipments.length > 0) {
      sections.push(
        `### Shipments (${shipments.length})\n` +
        shipments.map((s) =>
          `- ${s.shipmentNumber} | Order: ${s.salesOrderRef ?? "N/A"} | Carrier: ${s.carrier ?? "N/A"} | Tracking: ${s.trackingNumber ?? "N/A"} | Status: ${s.status} | Shipped: ${s.shippedAt ?? "pending"}`
        ).join("\n"),
      );
    } else {
      sections.push("### Shipments\nNo shipments found for this warehouse.");
    }
  }

  // --- 4. Workflows ---
  if (isWorkflowQuery && warehouseId) {
    const workflows = await safeQuery(() =>
      prisma.workflowTemplate.findMany({
        where: { warehouseId },
        select: { id: true, name: true, version: true, isActive: true, stages: true, createdAt: true },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    );
    if (workflows && workflows.length > 0) {
      sections.push(
        `### Workflows (${workflows.length})\n` +
        workflows.map((w) => {
          const stages = Array.isArray(w.stages) ? w.stages as Array<Record<string, unknown>> : [];
          const stageNames = stages.map((s) => s.label ?? s.type).join(" → ");
          return `- "${w.name}" v${w.version} (${w.isActive ? "active" : "inactive"}) — Stages: ${stageNames || "none"}`;
        }).join("\n"),
      );
    } else {
      sections.push("### Workflows\nNo workflow templates found for this warehouse.");
    }
  }

  // --- 5. Workers / staff / schedules ---
  if (isWorkerQuery && warehouseId) {
    const [workers, statusCounts, todaySchedules] = await Promise.all([
      safeQuery(() =>
        prisma.workerProfile.findMany({
          where: { warehouseId },
          select: {
            employeeCode: true, firstName: true, lastName: true,
            email: true, phone: true, status: true, hireDate: true,
            certifications: true,
          },
          orderBy: [{ status: "asc" }, { lastName: "asc" }],
          take: 25,
        }),
      ),
      safeQuery(() =>
        prisma.workerProfile.groupBy({
          by: ["status"],
          where: { warehouseId },
          _count: { _all: true },
        }),
      ),
      safeQuery(() => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        return prisma.schedule.findMany({
          where: { warehouseId, scheduleDate: { gte: start, lt: end } },
          select: {
            scheduleDate: true, plannedStart: true, plannedEnd: true,
            status: true, confirmationStatus: true,
            workerProfile: { select: { employeeCode: true, firstName: true, lastName: true } },
            shift: { select: { name: true, shiftType: true, startTime: true, endTime: true } },
          },
          orderBy: { plannedStart: "asc" },
          take: 30,
        });
      }),
    ]);

    if (workers && workers.length > 0) {
      const statusSummary = statusCounts && statusCounts.length > 0
        ? statusCounts.map((s) => `${s.status}: ${s._count._all}`).join(", ")
        : "no status breakdown";
      sections.push(
        `### Workers (${workers.length} shown — ${statusSummary})\n` +
        workers.map((w) =>
          `- ${w.employeeCode} | ${w.firstName} ${w.lastName} | ${w.status}` +
          (w.email ? ` | ${w.email}` : "") +
          (w.certifications && w.certifications.length > 0 ? ` | certs: ${w.certifications.join(", ")}` : "")
        ).join("\n"),
      );
    } else {
      sections.push("### Workers\nNo worker profiles found for this warehouse.");
    }

    if (todaySchedules && todaySchedules.length > 0) {
      sections.push(
        `### Today's Schedule (${todaySchedules.length})\n` +
        todaySchedules.map((s) => {
          const w = s.workerProfile;
          const sh = s.shift;
          const window = s.plannedStart && s.plannedEnd
            ? `${new Date(s.plannedStart).toISOString().slice(11, 16)}–${new Date(s.plannedEnd).toISOString().slice(11, 16)}`
            : `${sh?.startTime ?? "?"}–${sh?.endTime ?? "?"}`;
          return `- ${w.employeeCode} ${w.firstName} ${w.lastName} | ${sh?.name ?? "shift"} (${sh?.shiftType ?? "?"}) | ${window} | ${s.status}/${s.confirmationStatus}`;
        }).join("\n"),
      );
    } else {
      sections.push("### Today's Schedule\nNo schedule entries for today at this warehouse.");
    }
  }

  // --- 6. General list / overview ---
  if (isListQuery && !isTrackingQuery && !isInventoryQuery && !isShipmentQuery && !isWorkflowQuery && !isWorkerQuery && warehouseId) {
    const [itemCount, shipmentCount, workflowCount, recentItems] = await Promise.all([
      safeQuery(() => prisma.trackingItem.count({ where: { warehouseId } })),
      safeQuery(() => prisma.shipment.count({ where: { warehouseId } })),
      safeQuery(() => prisma.workflowTemplate.count({ where: { warehouseId } })),
      safeQuery(() => prisma.trackingItem.findMany({
        where: { warehouseId },
        select: { barcode: true, skuCode: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })),
    ]);
    sections.push(
      `### Warehouse Overview\n` +
      `- Total tracking items: ${itemCount ?? 0}\n` +
      `- Total shipments: ${shipmentCount ?? 0}\n` +
      `- Workflow templates: ${workflowCount ?? 0}\n` +
      (recentItems && recentItems.length > 0
        ? `\n### Most Recent Items\n` + recentItems.map((i) =>
            `- ${i.barcode} | SKU: ${i.skuCode} | ${i.description ?? ""} | Created: ${i.createdAt}`
          ).join("\n")
        : ""),
    );
  }

  // --- 7. Fallback: always give warehouse stats if nothing matched ---
  if (sections.length === 0 && warehouseId) {
    const [itemCount, shipmentCount, workflowCount] = await Promise.all([
      safeQuery(() => prisma.trackingItem.count({ where: { warehouseId } })),
      safeQuery(() => prisma.shipment.count({ where: { warehouseId } })),
      safeQuery(() => prisma.workflowTemplate.count({ where: { warehouseId } })),
    ]);
    sections.push(
      `### Warehouse Overview\n` +
      `- Total tracking items: ${itemCount ?? 0}\n` +
      `- Total shipments: ${shipmentCount ?? 0}\n` +
      `- Workflow templates: ${workflowCount ?? 0}\n` +
      `\nNote: I searched but could not determine what specific data the user is asking about. Show them these stats and ask them to clarify.`,
    );
  }

  if (sections.length === 0) return "\n\n## Live Data\nNo warehouse is selected. Ask the user to select a warehouse first.";

  const header = resolved.resolvedFromQuery && resolved.code
    ? `\n\n## Live Data from ${resolved.name ?? resolved.code} (${resolved.code})\nBelow is real data queried from the database for the warehouse the user named in their question. Use ONLY this data to answer. If the data says 'not found', tell the user clearly.\n\n`
    : "\n\n## Live Data from Your Warehouse\nBelow is real data queried from the database. Use ONLY this data to answer the user. If the data says 'not found', tell the user clearly.\n\n";

  return header + sections.join("\n\n");
}
