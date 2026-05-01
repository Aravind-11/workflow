import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { resolveWorkflow } from "@/lib/workflow/engine";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const warehouseId = url.searchParams.get("warehouseId") ?? auth.warehouseId;
  const projectId = url.searchParams.get("projectId") ?? undefined;

  if (!warehouseId) {
    return NextResponse.json(
      { error: "warehouseId is required" },
      { status: 400 },
    );
  }

  const workflow = await resolveWorkflow(warehouseId, projectId);

  return NextResponse.json({
    id: workflow.id || null,
    name: workflow.name,
    version: workflow.version,
    isActive: workflow.isActive,
    stages: workflow.stages.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      entityBinding: s.entityBinding,
    })),
    edges: workflow.edges.map((e) => ({
      source: e.source,
      target: e.target,
    })),
  });
}
