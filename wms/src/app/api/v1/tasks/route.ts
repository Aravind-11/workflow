import { NextResponse } from "next/server";
import { authenticateApiKey, isAuthError } from "@/lib/api/auth";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const warehouseId = url.searchParams.get("warehouseId") ?? auth.warehouseId;
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);

  if (!warehouseId) {
    return NextResponse.json(
      { error: "warehouseId is required" },
      { status: 400 },
    );
  }

  const tasks = await prisma.task.findMany({
    where: {
      warehouseId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      workerProfile: { select: { firstName: true, lastName: true } },
      location: { select: { locationCode: true, zone: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      taskType: t.taskType,
      status: t.status,
      priority: t.priority,
      workflowStageId: t.workflowStageId,
      workflowStageType: t.workflowStageType,
      worker: t.workerProfile
        ? `${t.workerProfile.firstName} ${t.workerProfile.lastName}`
        : null,
      location: t.location,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    })),
  });
}
