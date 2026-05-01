import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { executeStageAction } from "@/features/workflow/execute-stage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stageId: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const { stageId } = await params;
  const body = await request.json();

  const { warehouseId, projectId, stageType, formData, trackingItemId, fromStageType } = body;

  if (!warehouseId || !stageType) {
    return NextResponse.json(
      { error: "warehouseId and stageType are required" },
      { status: 400 },
    );
  }

  const result = await executeStageAction({
    warehouseId,
    projectId,
    stageType,
    formData: formData ?? {},
    trackingItemId,
    fromStageType,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
